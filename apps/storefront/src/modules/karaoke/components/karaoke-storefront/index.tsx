"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addKaraokeToCart,
  getKaraokeCommerce,
} from "@lib/data/karaoke-commerce"
import type { KaraokeCommerceMap } from "@lib/data/karaoke-commerce"

type KaraokeItem = {
  id: string
  artista: string
  titulo: string
  marca?: string
  origen?: string
  anio?: string
  mesN?: string
  mes?: string
  variante?: string
  coros?: string
  audioFormato?: string
  cdg?: boolean
  audio?: boolean
}

type CatalogPayload = {
  count?: number
  generatedAt?: string
  items?: KaraokeItem[]
}

type DemoSession = {
  ok?: boolean
  duration?: number
  player?: {
    audioUrl?: string
    cdgUrl?: string
    duration?: number
    autoplay?: boolean
    start?: number
  }
}

const PAGE_SIZE = 20

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim()
}

function money(amount: number | null, currencyCode: string | null) {
  if (amount === null || !currencyCode) return "—"

  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode.toUpperCase()} ${amount}`
  }
}

function fullUrl(value: string, base: string) {
  return new URL(value, base.endsWith("/") ? base : `${base}/`).toString()
}

function pageFromLocation() {
  if (typeof window === "undefined") return { q: "", page: 1 }
  const params = new URLSearchParams(window.location.search)
  const page = Math.max(1, Number(params.get("page") || "1") || 1)
  return { q: params.get("q") || "", page }
}

export default function KaraokeStorefront({
  countryCode,
}: {
  countryCode: string
}) {
  const router = useRouter()
  const [songs, setSongs] = useState<KaraokeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [commerce, setCommerce] = useState<KaraokeCommerceMap>({})
  const [commerceLoading, setCommerceLoading] = useState(false)
  const [addingId, setAddingId] = useState("")
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState("")
  const [demoBusyId, setDemoBusyId] = useState("")
  const [demoTitle, setDemoTitle] = useState("")
  const [playerUrl, setPlayerUrl] = useState("")

  useEffect(() => {
    const initial = pageFromLocation()
    setQuery(initial.q)
    setPage(initial.page)

    const onPopState = () => {
      const state = pageFromLocation()
      setQuery(state.q)
      setPage(state.page)
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    let active = true

    fetch("/data/catalogo-karaoke.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as CatalogPayload
      })
      .then((payload) => {
        if (!active) return
        setSongs(Array.isArray(payload.items) ? payload.items : [])
        setLoading(false)
      })
      .catch((error) => {
        if (!active) return
        console.error("[TOP PERU CATALOG]", error)
        setLoadError("No se pudo cargar el catálogo TOP PERÚ.")
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    if (!terms.length) return songs

    return songs.filter((song) => {
      const haystack = normalize(
        [
          song.titulo,
          song.artista,
          song.marca,
          song.variante,
          song.anio,
          song.mes,
          song.id,
        ].join(" ")
      )
      return terms.every((term) => haystack.includes(term))
    })
  }, [query, songs])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleSongs = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  useEffect(() => {
    if (!visibleSongs.length) {
      setCommerce({})
      return
    }

    let active = true
    setCommerceLoading(true)

    getKaraokeCommerce(
      visibleSongs.map((song) => song.id),
      countryCode
    )
      .then((map) => {
        if (active) setCommerce(map)
      })
      .catch((error) => {
        console.error("[MEDUSA KARAOKE BRIDGE]", error)
        if (active) setCommerce({})
      })
      .finally(() => {
        if (active) setCommerceLoading(false)
      })

    return () => {
      active = false
    }
  }, [countryCode, visibleSongs])

  function writeUrl(nextQuery: string, nextPage: number, push = false) {
    const url = new URL(window.location.href)
    const trimmed = nextQuery.trim()

    if (trimmed) url.searchParams.set("q", trimmed)
    else url.searchParams.delete("q")

    if (nextPage > 1) url.searchParams.set("page", String(nextPage))
    else url.searchParams.delete("page")

    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    if (push) window.history.pushState({}, "", nextUrl)
    else window.history.replaceState({}, "", nextUrl)
  }

  function onSearch(value: string) {
    setQuery(value)
    setPage(1)
    writeUrl(value, 1)
  }

  function goToPage(nextPage: number) {
    const bounded = Math.max(1, Math.min(totalPages, nextPage))
    setPage(bounded)
    writeUrl(query, bounded, true)
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })
  }

  async function openDemo(song: KaraokeItem) {
    const apiBase = process.env.NEXT_PUBLIC_TOP_PERU_DEMO_API_BASE?.trim() || ""
    const playerBase = process.env.NEXT_PUBLIC_CDG_PLAYER_URL?.trim() || ""

    if (!apiBase || !playerBase) {
      setNotice(
        "El frontend está listo, pero faltan NEXT_PUBLIC_TOP_PERU_DEMO_API_BASE y NEXT_PUBLIC_CDG_PLAYER_URL en este entorno."
      )
      return
    }

    setNotice("")
    setDemoBusyId(song.id)

    try {
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/api/store/demo/session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_cancion: song.id }),
        }
      )

      if (!response.ok) throw new Error(`Demo HTTP ${response.status}`)

      const session = (await response.json()) as DemoSession
      const audioUrl = session.player?.audioUrl
      const cdgUrl = session.player?.cdgUrl

      if (!audioUrl || !cdgUrl) {
        throw new Error("La sesión demo no devolvió audioUrl/cdgUrl.")
      }

      const player = new URL(playerBase)
      player.searchParams.set("audio", fullUrl(audioUrl, apiBase))
      player.searchParams.set("cdg", fullUrl(cdgUrl, apiBase))
      player.searchParams.set("title", `${song.artista} - ${song.titulo}`)
      player.searchParams.set(
        "duration",
        String(session.player?.duration || session.duration || 60)
      )
      player.searchParams.set("start", String(session.player?.start || 0))
      player.searchParams.set(
        "autoplay",
        session.player?.autoplay === false ? "0" : "1"
      )

      setDemoTitle(`${song.artista} — ${song.titulo}`)
      setPlayerUrl(player.toString())
    } catch (error) {
      console.error("[TOP PERU DEMO]", error)
      setNotice(
        error instanceof Error
          ? `No se pudo abrir el demo: ${error.message}`
          : "No se pudo abrir el demo."
      )
    } finally {
      setDemoBusyId("")
    }
  }

  async function addSong(song: KaraokeItem) {
    setNotice("")
    setAddingId(song.id)

    try {
      const result = await addKaraokeToCart({
        idCancion: song.id,
        countryCode,
      })

      setAddedIds((current) => new Set(current).add(song.id))
      setNotice(
        result.status === "already"
          ? "Ese karaoke ya estaba en tu carrito."
          : `${song.titulo} se agregó al carrito.`
      )
      router.refresh()
    } catch (error) {
      console.error("[MEDUSA ADD KARAOKE]", error)
      setNotice(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el karaoke al carrito."
      )
    } finally {
      setAddingId("")
    }
  }

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, safePage - 2)
    const end = Math.min(totalPages, start + 4)
    const adjustedStart = Math.max(1, end - 4)

    return Array.from(
      { length: end - adjustedStart + 1 },
      (_, index) => adjustedStart + index
    )
  }, [safePage, totalPages])

  return (
    <main className="bg-white text-ui-fg-base">
      <section className="border-b bg-gradient-to-b from-ui-bg-subtle to-white">
        <div className="content-container py-10 small:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ui-fg-muted">
            El Club Karaoke DJGABO · TOP PERÚ
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight small:text-5xl">
            Encuentra tu karaoke y pruébalo al instante
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-ui-fg-subtle small:text-base">
            Busca por canción, artista, grupo o código. Escucha el demo de 60 segundos y sigue comprando sin salir del catálogo.
          </p>

          <div className="mt-7 max-w-4xl">
            <label htmlFor="karaoke-search" className="sr-only">
              Buscar karaoke
            </label>
            <div className="flex rounded-xl border border-ui-border-base bg-white shadow-sm focus-within:ring-2 focus-within:ring-ui-fg-base/20">
              <span className="flex items-center pl-4 text-lg" aria-hidden="true">
                🔎
              </span>
              <input
                id="karaoke-search"
                value={query}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Busca canción, artista o grupo..."
                className="min-w-0 flex-1 bg-transparent px-3 py-4 text-base outline-none small:text-lg"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  className="px-4 text-sm font-medium text-ui-fg-muted hover:text-ui-fg-base"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo" className="content-container py-8 small:py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              {query ? "Resultados" : "Nuevos karaokes"}
            </h2>
            <p className="mt-1 text-sm text-ui-fg-muted">
              {loading
                ? "Cargando catálogo…"
                : `${filtered.length.toLocaleString("es-PE")} karaokes encontrados`}
            </p>
          </div>
          {commerceLoading && (
            <span className="text-xs text-ui-fg-muted">Actualizando precios Medusa…</span>
          )}
        </div>

        {notice && (
          <div className="mb-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="overflow-hidden rounded-xl border border-ui-border-base bg-white">
            <div className="hidden grid-cols-[92px_minmax(0,1.5fr)_minmax(0,1fr)_120px_138px] gap-3 border-b bg-ui-bg-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ui-fg-muted small:grid">
              <span>Demo</span>
              <span>Canción</span>
              <span>Artista</span>
              <span>Precio</span>
              <span className="text-right">Carrito</span>
            </div>

            <div className="divide-y divide-ui-border-base">
              {visibleSongs.map((song) => {
                const sale = commerce[song.id]
                const added = addedIds.has(song.id)
                const isAdding = addingId === song.id
                const demoBusy = demoBusyId === song.id

                return (
                  <article
                    key={song.id}
                    className="grid gap-3 px-4 py-4 transition hover:bg-ui-bg-subtle small:grid-cols-[92px_minmax(0,1.5fr)_minmax(0,1fr)_120px_138px] small:items-center"
                  >
                    <button
                      type="button"
                      onClick={() => openDemo(song)}
                      disabled={demoBusy}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-full border border-ui-border-base px-3 py-2 text-xs font-semibold hover:border-ui-fg-base disabled:opacity-50"
                    >
                      <span aria-hidden="true">▶</span>
                      {demoBusy ? "CARGANDO" : "DEMO"}
                    </button>

                    <div className="min-w-0">
                      <div className="truncate font-semibold" title={song.titulo}>
                        {song.titulo}
                      </div>
                      <div className="mt-1 text-xs text-ui-fg-muted small:hidden">
                        {song.artista}
                      </div>
                      <div className="mt-1 text-[11px] text-ui-fg-muted">
                        {song.id}
                        {song.variante ? ` · ${song.variante}` : ""}
                      </div>
                    </div>

                    <div
                      className="hidden min-w-0 truncate text-sm small:block"
                      title={song.artista}
                    >
                      {song.artista}
                    </div>

                    <div className="text-sm font-semibold">
                      {money(sale?.amount ?? null, sale?.currencyCode ?? null)}
                    </div>

                    <button
                      type="button"
                      onClick={() => addSong(song)}
                      disabled={isAdding || added}
                      title={
                        sale
                          ? "Agregar al carrito Medusa"
                          : "Requiere variante Medusa con SKU igual a ID_CANCION"
                      }
                      className="inline-flex w-fit items-center justify-center rounded-lg bg-ui-fg-base px-4 py-2.5 text-xs font-semibold text-ui-bg-base transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55 small:ml-auto"
                    >
                      {isAdding
                        ? "AGREGANDO…"
                        : added
                          ? "✓ AGREGADO"
                          : "🛒 AGREGAR"}
                    </button>
                  </article>
                )
              })}
            </div>

            {!visibleSongs.length && (
              <div className="px-6 py-12 text-center text-sm text-ui-fg-muted">
                No encontramos karaokes con esa búsqueda.
              </div>
            )}
          </div>
        )}

        {!loading && filtered.length > PAGE_SIZE && (
          <nav
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
            aria-label="Paginación del catálogo"
          >
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
            >
              ←
            </button>
            {pageNumbers.map((number) => (
              <button
                type="button"
                key={number}
                onClick={() => goToPage(number)}
                aria-current={number === safePage ? "page" : undefined}
                className={`min-w-10 rounded-md border px-3 py-2 text-sm ${
                  number === safePage
                    ? "border-ui-fg-base bg-ui-fg-base text-ui-bg-base"
                    : "border-ui-border-base hover:border-ui-fg-base"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
            >
              →
            </button>
          </nav>
        )}
      </section>

      <section id="explorar" className="border-t bg-ui-bg-subtle">
        <div className="content-container py-10">
          <h2 className="text-xl font-semibold">🎵 Búsquedas rápidas</h2>
          <p className="mt-1 text-sm text-ui-fg-muted">
            Atajos de búsqueda; no sustituyen la clasificación oficial del catálogo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Cumbia", "Salsa", "Balada", "Criollo", "Rock", "Pop", "Huayno"].map(
              (term) => (
                <button
                  type="button"
                  key={term}
                  onClick={() => {
                    onSearch(term)
                    document.getElementById("catalogo")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }}
                  className="rounded-full border border-ui-border-base bg-white px-4 py-2 text-sm hover:border-ui-fg-base"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {playerUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 small:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Demo ${demoTitle}`}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ui-fg-muted">
                  Demo · 60 segundos
                </p>
                <p className="truncate font-semibold">{demoTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPlayerUrl("")
                  setDemoTitle("")
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl hover:bg-ui-bg-subtle"
                aria-label="Cerrar demo"
              >
                ×
              </button>
            </div>
            <iframe
              src={playerUrl}
              title={`Karaoke demo ${demoTitle}`}
              className="aspect-video w-full bg-black"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </main>
  )
}
