import { getDjgaboJsonIpv4 } from "./djgabo-http-ipv4"

export type DjgaboTariff = {
  cantidad: number
  precioTotal: number
  precioUnitario?: number
  texto?: string
  descripcion?: string
}

type DjgaboPricingPayload = {
  ok?: boolean
  tarifas?: unknown
}

const DEFAULT_DJGABO_PRICING_API_URL =
  "https://script.google.com/macros/s/AKfycbwMsLDUtsuzPFqjUXC4N6dEWWlIK_cuI-xGsXDORHJKMHpfouCERmdM9W9GGpVmCOb2/exec"

export function allocateTierTotal(total: number, paidCount: number): number[] {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("DJGABO tier total must be a non-negative integer")
  }
  if (!Number.isSafeInteger(paidCount) || paidCount < 1) {
    throw new Error("DJGABO paid track count must be a positive integer")
  }

  const base = Math.floor(total / paidCount)
  const remainder = total % paidCount

  return Array.from(
    { length: paidCount },
    (_, index) => base + (index < remainder ? 1 : 0)
  )
}

export function selectDjgaboTariff(
  payload: DjgaboPricingPayload,
  paidCount: number
): DjgaboTariff {
  if (!Number.isSafeInteger(paidCount) || paidCount < 1) {
    throw new Error("DJGABO paid track count must be a positive integer")
  }

  if (!Array.isArray(payload?.tarifas)) {
    throw new Error("DJGABO pricing response does not contain tarifas")
  }

  const raw = payload.tarifas.find((entry: any) => {
    return Number(entry?.cantidad) === paidCount
  }) as any

  if (!raw) {
    throw new Error(`No active DJGABO tariff for ${paidCount} paid tracks`)
  }

  const precioTotal = Number(raw.precioTotal)
  if (!Number.isSafeInteger(precioTotal) || precioTotal < 0) {
    throw new Error(`Invalid DJGABO total for ${paidCount} paid tracks`)
  }

  return {
    cantidad: paidCount,
    precioTotal,
    precioUnitario:
      Number.isFinite(Number(raw.precioUnitario))
        ? Number(raw.precioUnitario)
        : undefined,
    texto:
      typeof raw.texto === "string"
        ? raw.texto
        : typeof raw.label === "string"
          ? raw.label
          : undefined,
    descripcion:
      typeof raw.descripcion === "string" ? raw.descripcion : undefined,
  }
}

function isRetryablePricingFetchError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const name = "name" in error
      ? String((error as { name?: unknown }).name || "")
      : ""
    if (name === "AbortError" || name === "TimeoutError") {
      return true
    }

    const code = "code" in error
      ? String((error as { code?: unknown }).code || "")
      : ""
    if (["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH", "ECONNREFUSED"].includes(code)) {
      return true
    }
  }

  return error instanceof TypeError
}

export async function fetchDjgaboPublicTariff(
  paidCount: number,
  options: {
    fetchImpl?: typeof fetch
    pricingApiUrl?: string
    timeoutMs?: number
    maxAttempts?: number
  } = {}
): Promise<DjgaboTariff> {
  const fetchImpl = options.fetchImpl
  const pricingApiUrl =
    options.pricingApiUrl ||
    process.env.DJGABO_PRICING_API_URL ||
    DEFAULT_DJGABO_PRICING_API_URL
  const timeoutMs = options.timeoutMs ?? 15000
  const maxAttempts = options.maxAttempts ?? 2

  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    throw new Error("DJGABO pricing maxAttempts must be between 1 and 3")
  }

  let lastError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = new URL(pricingApiUrl)
    url.searchParams.set("tipo", "precios_web")
    url.searchParams.set("segmento", "PUBLICO")
    url.searchParams.set("v", `${Date.now()}-${attempt}`)

    let timer: ReturnType<typeof setTimeout> | undefined

    try {
      let status: number
      let ok: boolean
      let payload: DjgaboPricingPayload

      if (fetchImpl) {
        const controller = new AbortController()
        timer = setTimeout(() => controller.abort(), timeoutMs)
        const response = await fetchImpl(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            "user-agent": "DJGABO-Medusa-Pricing/1.0",
          },
          cache: "no-store",
          signal: controller.signal,
        })
        status = response.status
        ok = response.ok
        payload = (ok ? await response.json() : {}) as DjgaboPricingPayload
      } else {
        // OVH Docker has unreliable IPv6/undici routing to Apps Script. The
        // native production path therefore uses HTTPS explicitly pinned to IPv4.
        const response = await getDjgaboJsonIpv4(url, {
          timeoutMs,
          headers: {
            accept: "application/json",
            "user-agent": "DJGABO-Medusa-Pricing/1.0",
          },
        })
        status = response.status
        ok = response.ok
        if (ok && response.payload === undefined) {
          throw new TypeError("DJGABO pricing API returned invalid JSON")
        }
        payload = (response.payload || {}) as DjgaboPricingPayload
      }

      if (!ok) {
        const error = new Error(`DJGABO pricing API HTTP ${status}`)
        lastError = error
        const retryableStatus = status === 429 || status >= 500
        if (retryableStatus && attempt < maxAttempts) {
          continue
        }
        throw error
      }

      return selectDjgaboTariff(payload, paidCount)
    } catch (error) {
      lastError = error
      if (!isRetryablePricingFetchError(error) || attempt >= maxAttempts) {
        throw error
      }
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("DJGABO pricing API request failed")
}
