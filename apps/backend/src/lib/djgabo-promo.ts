export type DjgaboWebPromo = {
  active: boolean
  segment: string
  code: string
  maxFree: number
  minPaid: number
  linkWeb?: string
  source: "PROMOS_WEB"
}

type DjgaboPromoPayload = Record<string, unknown>

const DEFAULT_DJGABO_PROMO_API_URL =
  "https://script.google.com/macros/s/AKfycbwMsLDUtsuzPFqjUXC4N6dEWWlIK_cuI-xGsXDORHJKMHpfouCERmdM9W9GGpVmCOb2/exec"

const PUBLIC_SEGMENT = "PUBLICO"

function firstValue(payload: DjgaboPromoPayload, keys: string[]): unknown {
  for (const key of keys) {
    const value = payload?.[key]
    if (value !== undefined && value !== null && value !== "") {
      return value
    }
  }
  return undefined
}

function isPromoActive(value: unknown): boolean {
  if (value === true) {
    return true
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  return normalized === "si" || normalized === "true" || normalized === "1"
}

function parseRequiredPromoInteger(
  payload: DjgaboPromoPayload,
  keys: string[],
  label: string,
  minimum: number
): number {
  const raw = firstValue(payload, keys)
  const parsed = Number(String(raw ?? "").replace(",", "."))

  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`Invalid DJGABO PROMOS WEB ${label}`)
  }

  return parsed
}

export function normalizeDjgaboPromoLinkSlug(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw) {
    return ""
  }

  try {
    const parsed = new URL(raw)
    const querySlug = String(parsed.searchParams.get("p") || "").trim()
    if (querySlug) {
      return querySlug.toLowerCase()
    }

    const pathSlug = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .pop()

    return String(pathSlug || "").toLowerCase()
  } catch {
    return raw
      .replace(/^\?p=/i, "")
      .replace(/^p=/i, "")
      .split(/[?#&]/)[0]
      .trim()
      .toLowerCase()
  }
}

export function inactiveDjgaboWebPromo(
  segment = PUBLIC_SEGMENT,
  code = "",
  linkWeb = ""
): DjgaboWebPromo {
  return {
    active: false,
    segment: String(segment || PUBLIC_SEGMENT).toUpperCase(),
    code: String(code || ""),
    maxFree: 0,
    minPaid: 0,
    linkWeb: normalizeDjgaboPromoLinkSlug(linkWeb) || undefined,
    source: "PROMOS_WEB",
  }
}

export function selectDjgaboWebPromo(
  payload: DjgaboPromoPayload,
  options: {
    segment?: string
    linkWeb?: string
  } = {}
): DjgaboWebPromo {
  const segment = String(options.segment || PUBLIC_SEGMENT).toUpperCase()
  const requestedLink = normalizeDjgaboPromoLinkSlug(options.linkWeb || "")
  const code = String(
    firstValue(payload, ["codigoPromo", "CODIGO_PROMO"]) || "PROMO_WEB"
  ).trim()
  const returnedLink = normalizeDjgaboPromoLinkSlug(
    firstValue(payload, ["linkWeb", "LINK_WEB", "promoSlug", "PROMO_SLUG"]) || ""
  )
  const active = isPromoActive(firstValue(payload, ["active", "activo"]))

  if (!active) {
    return inactiveDjgaboWebPromo(segment, code, returnedLink || requestedLink)
  }

  if (
    segment === PUBLIC_SEGMENT &&
    requestedLink &&
    returnedLink &&
    requestedLink !== returnedLink
  ) {
    return inactiveDjgaboWebPromo(segment, code, returnedLink)
  }

  const maxFree = parseRequiredPromoInteger(
    payload,
    ["pistasGratis", "PISTAS_GRATIS", "gratis"],
    "free-track limit",
    1
  )
  const minPaid = parseRequiredPromoInteger(
    payload,
    ["minCompra", "minimoCompra", "MIN_COMPRA", "MINIMO_COMPRA"],
    "minimum paid-track count",
    1
  )

  return {
    active: true,
    segment,
    code: code || "PROMO_WEB",
    maxFree,
    minPaid,
    linkWeb: returnedLink || requestedLink || undefined,
    source: "PROMOS_WEB",
  }
}

export async function fetchDjgaboPublicWebPromo(
  options: {
    fetchImpl?: typeof fetch
    promoApiUrl?: string
    timeoutMs?: number
    linkWeb?: string
  } = {}
): Promise<DjgaboWebPromo> {
  const segment = PUBLIC_SEGMENT
  const linkWeb = normalizeDjgaboPromoLinkSlug(options.linkWeb || "")

  // Mirrors TIENDA_PISTAS_WEB: PUBLICO promos are exposed only through ?p=...
  // when a LINK_WEB campaign is being used. A normal store visit stays clean.
  if (!linkWeb) {
    return inactiveDjgaboWebPromo(segment)
  }

  const fetchImpl = options.fetchImpl || fetch
  const promoApiUrl =
    options.promoApiUrl ||
    process.env.DJGABO_PROMO_API_URL ||
    process.env.DJGABO_PRICING_API_URL ||
    DEFAULT_DJGABO_PROMO_API_URL
  const timeoutMs = options.timeoutMs ?? 8000

  const url = new URL(promoApiUrl)
  url.searchParams.set("tipo", "promo_web")
  url.searchParams.set("segmento", segment)
  url.searchParams.set("link_web", linkWeb)
  url.searchParams.set("v", Date.now().toString())

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "DJGABO-Medusa-Promo/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`DJGABO PROMOS WEB API HTTP ${response.status}`)
    }

    const payload = (await response.json()) as DjgaboPromoPayload
    return selectDjgaboWebPromo(payload, {
      segment,
      linkWeb,
    })
  } finally {
    clearTimeout(timer)
  }
}
