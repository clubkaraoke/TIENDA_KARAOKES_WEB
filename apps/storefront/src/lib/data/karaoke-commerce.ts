"use server"

import { sdk } from "@lib/config"
import { addToCart, retrieveCart } from "@lib/data/cart"
import { getAuthHeaders } from "@lib/data/cookies"
import { getRegion } from "@lib/data/regions"

export type KaraokeCommerceItem = {
  variantId: string
  amount: number | null
  currencyCode: string | null
}

export type KaraokeCommerceMap = Record<string, KaraokeCommerceItem>

type VariantLookup = {
  id: string
  sku?: string | null
  product_id?: string | null
}

type ProductWithVariants = {
  id: string
  variants?: Array<{
    id: string
    sku?: string | null
    calculated_price?: {
      calculated_amount?: number | null
      currency_code?: string | null
    } | null
  }>
}

/**
 * TOP PERÚ commerce bridge.
 * ID_CANCION is the canonical logical identifier. The corresponding Medusa
 * digital-product variant must use the same value as its SKU.
 */
export async function getKaraokeCommerce(
  ids: string[],
  countryCode: string
): Promise<KaraokeCommerceMap> {
  const requested = Array.from(
    new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))
  ).slice(0, 100)

  if (!requested.length) return {}

  const region = await getRegion(countryCode)
  if (!region) return {}

  const headers = {
    ...(await getAuthHeaders()),
  }

  const { variants = [] } = await sdk.client.fetch<{
    variants: VariantLookup[]
  }>("/store/product-variants", {
    method: "GET",
    query: {
      sku: requested,
      limit: requested.length,
      fields: "id,sku,product_id",
    },
    headers,
    cache: "no-store",
  })

  const result: KaraokeCommerceMap = {}

  for (const variant of variants) {
    const sku = String(variant.sku || "").trim()
    if (!sku || !requested.includes(sku)) continue

    result[sku] = {
      variantId: variant.id,
      amount: null,
      currencyCode: region.currency_code || null,
    }
  }

  const productIds = Array.from(
    new Set(variants.map((variant) => variant.product_id).filter(Boolean))
  ) as string[]

  if (!productIds.length) return result

  try {
    const { products = [] } = await sdk.client.fetch<{
      products: ProductWithVariants[]
    }>("/store/products", {
      method: "GET",
      query: {
        id: productIds,
        limit: productIds.length,
        region_id: region.id,
        country_code: countryCode,
        fields: "id,variants.id,variants.sku,*variants.calculated_price",
      },
      headers,
      cache: "no-store",
    })

    for (const product of products) {
      for (const variant of product.variants || []) {
        const sku = String(variant.sku || "").trim()
        if (!sku || !result[sku]) continue

        result[sku] = {
          ...result[sku],
          amount: variant.calculated_price?.calculated_amount ?? null,
          currencyCode:
            variant.calculated_price?.currency_code ||
            region.currency_code ||
            null,
        }
      }
    }
  } catch {
    // Variant ID is sufficient for cart actions; price enrichment is best-effort.
  }

  return result
}

export async function addKaraokeToCart({
  idCancion,
  countryCode,
}: {
  idCancion: string
  countryCode: string
}): Promise<{ status: "added" | "already" }> {
  const commerce = await getKaraokeCommerce([idCancion], countryCode)
  const match = commerce[idCancion]

  if (!match?.variantId) {
    throw new Error(
      `El karaoke ${idCancion} todavía no está sincronizado con una variante Medusa.`
    )
  }

  const cart = await retrieveCart(undefined, "id,*items.variant")
  const alreadyInCart = Boolean(
    cart?.items?.some(
      (item) =>
        item.variant_id === match.variantId || item.variant?.id === match.variantId
    )
  )

  if (alreadyInCart) return { status: "already" }

  await addToCart({
    variantId: match.variantId,
    quantity: 1,
    countryCode,
  })

  return { status: "added" }
}
