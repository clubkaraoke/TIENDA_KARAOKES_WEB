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

export async function fetchDjgaboPublicTariff(
  paidCount: number,
  options: {
    fetchImpl?: typeof fetch
    pricingApiUrl?: string
    timeoutMs?: number
  } = {}
): Promise<DjgaboTariff> {
  const fetchImpl = options.fetchImpl || fetch
  const pricingApiUrl =
    options.pricingApiUrl ||
    process.env.DJGABO_PRICING_API_URL ||
    DEFAULT_DJGABO_PRICING_API_URL
  const timeoutMs = options.timeoutMs ?? 8000

  const url = new URL(pricingApiUrl)
  url.searchParams.set("tipo", "precios_web")
  url.searchParams.set("segmento", "PUBLICO")
  url.searchParams.set("v", Date.now().toString())

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "DJGABO-Medusa-Pricing/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`DJGABO pricing API HTTP ${response.status}`)
    }

    const payload = (await response.json()) as DjgaboPricingPayload
    return selectDjgaboTariff(payload, paidCount)
  } finally {
    clearTimeout(timer)
  }
}
