import {
  djgaboCatalogIdentityKey,
  normalizeDjgaboDriveId,
  normalizeDjgaboSongKey,
} from "./djgabo-catalog"
import { getDjgaboJsonIpv4 } from "./djgabo-http-ipv4"

export type DjgaboStoreCatalogTrack = {
  songKey: string
  normalizedSongKey: string
  driveId: string
  artist: string
  title: string
}

export type DjgaboStoreCatalogIndex = {
  byIdentity: Map<string, DjgaboStoreCatalogTrack>
  ambiguousIdentities: Set<string>
  sourceRows: number
  indexedRows: number
  skippedWithoutDrive: number
}

type CatalogFetchImpl = (url: URL) => Promise<unknown>

type CatalogCache = {
  sourceUrl: string
  expiresAt: number
  index: DjgaboStoreCatalogIndex
}

const DEFAULT_DJGABO_STORE_CATALOG_URL =
  "https://kitkaraoke.com/tienda/data/catalogo.min.json"

let cache: CatalogCache | null = null
let inFlight: Promise<DjgaboStoreCatalogIndex> | null = null

const clean = (value: unknown): string => String(value || "").trim()

export function extractDjgaboDriveId(value: unknown): string {
  const raw = clean(value)
  if (!raw) return ""

  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
    return raw
  }

  try {
    const parsed = new URL(raw)
    const queryId = clean(parsed.searchParams.get("id"))
    if (queryId) {
      try {
        return normalizeDjgaboDriveId(queryId)
      } catch {
        return ""
      }
    }

    const pathMatch = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]+)/)
    if (pathMatch?.[1]) {
      try {
        return normalizeDjgaboDriveId(pathMatch[1])
      } catch {
        return ""
      }
    }
  } catch {
    return ""
  }

  return ""
}

function catalogRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  const record = payload as Record<string, unknown>
  for (const key of ["data", "items", "songs"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

function sameCatalogTrack(
  a: DjgaboStoreCatalogTrack,
  b: DjgaboStoreCatalogTrack
): boolean {
  return (
    a.normalizedSongKey === b.normalizedSongKey &&
    a.driveId === b.driveId &&
    a.artist.trim().toLocaleLowerCase() === b.artist.trim().toLocaleLowerCase() &&
    a.title.trim().toLocaleLowerCase() === b.title.trim().toLocaleLowerCase()
  )
}

export function buildDjgaboStoreCatalogIndex(
  payload: unknown
): DjgaboStoreCatalogIndex {
  const rows = catalogRows(payload)
  if (!rows.length) {
    throw new Error("DJGABO store catalog is empty or invalid")
  }

  const byIdentity = new Map<string, DjgaboStoreCatalogTrack>()
  const ambiguousIdentities = new Set<string>()
  let skippedWithoutDrive = 0
  let indexedRows = 0

  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as Record<string, unknown>
    const rawSongKey = clean(
      item.songKey || item.song_key || item.key || item.Key || item.SONG_KEY
    )
    if (!rawSongKey) continue

    const driveId = extractDjgaboDriveId(
      item.audio || item.url || item.URL || item.link || item.Link || item.enlace
    )
    if (!driveId) {
      skippedWithoutDrive += 1
      continue
    }

    const normalizedSongKey = normalizeDjgaboSongKey(rawSongKey)
    const identity = djgaboCatalogIdentityKey(normalizedSongKey, driveId)
    const track: DjgaboStoreCatalogTrack = {
      songKey: rawSongKey,
      normalizedSongKey,
      driveId,
      artist: clean(item.artist || item.Artista || item.artista),
      title: clean(item.title || item.Titulo || item.titulo),
    }

    indexedRows += 1
    if (ambiguousIdentities.has(identity)) continue

    const existing = byIdentity.get(identity)
    if (!existing) {
      byIdentity.set(identity, track)
      continue
    }

    if (!sameCatalogTrack(existing, track)) {
      byIdentity.delete(identity)
      ambiguousIdentities.add(identity)
    }
  }

  if (!byIdentity.size) {
    throw new Error("DJGABO store catalog has no usable Drive-backed tracks")
  }

  return {
    byIdentity,
    ambiguousIdentities,
    sourceRows: rows.length,
    indexedRows,
    skippedWithoutDrive,
  }
}

export function resolveDjgaboStoreCatalogTrack(
  index: DjgaboStoreCatalogIndex,
  songKey: string,
  driveId: string
): DjgaboStoreCatalogTrack {
  const identity = djgaboCatalogIdentityKey(songKey, driveId)
  if (index.ambiguousIdentities.has(identity)) {
    throw new Error("DJGABO catalog identity is ambiguous")
  }

  const track = index.byIdentity.get(identity)
  if (!track) {
    throw new Error("DJGABO track identity is not present in the trusted catalog")
  }
  return track
}

export async function loadDjgaboStoreCatalogIndex(
  options: {
    catalogUrl?: string
    timeoutMs?: number
    cacheTtlMs?: number
    fetchCatalogImpl?: CatalogFetchImpl
    now?: () => number
  } = {}
): Promise<DjgaboStoreCatalogIndex> {
  const catalogUrl =
    options.catalogUrl ||
    process.env.DJGABO_STORE_CATALOG_URL ||
    DEFAULT_DJGABO_STORE_CATALOG_URL
  const timeoutMs = options.timeoutMs ?? 30000
  const cacheTtlMs = options.cacheTtlMs ?? 15 * 60 * 1000
  const now = options.now || Date.now

  if (cache && cache.sourceUrl === catalogUrl && cache.expiresAt > now()) {
    return cache.index
  }
  if (inFlight) return inFlight

  const fetchCatalogImpl: CatalogFetchImpl =
    options.fetchCatalogImpl ||
    (async (url) => {
      const response = await getDjgaboJsonIpv4(url, {
        timeoutMs,
        headers: {
          accept: "application/json",
          "user-agent": "DJGABO-Medusa-Catalog/1.0",
          "cache-control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error(`DJGABO store catalog HTTP ${response.status}`)
      }
      if (response.payload === undefined) {
        throw new Error("DJGABO store catalog returned invalid JSON")
      }
      return response.payload
    })

  inFlight = (async () => {
    const payload = await fetchCatalogImpl(new URL(catalogUrl))
    const index = buildDjgaboStoreCatalogIndex(payload)
    cache = {
      sourceUrl: catalogUrl,
      expiresAt: now() + cacheTtlMs,
      index,
    }
    return index
  })().finally(() => {
    inFlight = null
  })

  return inFlight
}

export function clearDjgaboStoreCatalogCacheForTests(): void {
  cache = null
  inFlight = null
}
