import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  djgaboSkuFromSongKey,
  normalizeDjgaboSongKey,
} from "../../../../../lib/djgabo-catalog"
import {
  allocateTierTotal,
  fetchDjgaboPublicTariff,
} from "../../../../../lib/djgabo-pricing"
import {
  DjgaboWebPromo,
  fetchDjgaboPublicWebPromo,
} from "../../../../../lib/djgabo-promo"

type DjgaboSongRequest = {
  song_key: string
}

type DjgaboTierCartBody = {
  items: DjgaboSongRequest[]
  free_items?: DjgaboSongRequest[]
  promo?: {
    link_web?: string
  }
}

const badRequest = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const normalizeRequestedSongKeys = (
  items: DjgaboSongRequest[],
  label: string
): string[] => {
  const songKeys = items.map((item) => {
    try {
      return normalizeDjgaboSongKey(item?.song_key || "")
    } catch {
      return ""
    }
  })

  if (songKeys.some((key) => !key)) {
    badRequest(`Every DJGABO ${label} item requires song_key`)
  }

  if (new Set(songKeys).size !== songKeys.length) {
    badRequest(`The same DJGABO ${label} track cannot be added twice`)
  }

  return songKeys
}

export const POST = async (
  req: MedusaRequest<DjgaboTierCartBody>,
  res: MedusaResponse
) => {
  const requestedPaidItems = Array.isArray(req.body?.items) ? req.body.items : []
  const requestedFreeItems = Array.isArray(req.body?.free_items)
    ? req.body.free_items
    : []

  if (!requestedPaidItems.length) {
    badRequest("At least one DJGABO paid track is required")
  }

  if (requestedPaidItems.length > 50) {
    badRequest("DJGABO tier cart is limited to 50 paid tracks")
  }

  if (requestedFreeItems.length > 50) {
    badRequest("DJGABO tier cart is limited to 50 promotional free tracks")
  }

  const paidSongKeys = normalizeRequestedSongKeys(requestedPaidItems, "paid")
  const freeSongKeys = normalizeRequestedSongKeys(requestedFreeItems, "free")
  const allSongKeys = [...paidSongKeys, ...freeSongKeys]

  if (new Set(allSongKeys).size !== allSongKeys.length) {
    badRequest("A DJGABO track cannot be both paid and promotional free")
  }

  const allSkus = allSongKeys.map(djgaboSkuFromSongKey)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: ["id", "currency_code", "items.id"],
      filters: { id: req.params.id },
    },
    { throwIfKeyNotFound: true }
  )

  if (String(cart.currency_code || "").toLowerCase() !== "pen") {
    badRequest("DJGABO tier pricing requires a PEN cart")
  }

  if (Array.isArray(cart.items) && cart.items.length) {
    badRequest(
      "DJGABO tier items can only be priced into an empty bridge cart"
    )
  }

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "metadata", "digital_product.id"],
    filters: { sku: allSkus },
  })

  if (variants.length !== allSongKeys.length) {
    badRequest("One or more DJGABO tracks are not mapped in Medusa")
  }

  const variantsBySku = new Map(variants.map((variant) => [variant.sku, variant]))

  for (let index = 0; index < allSongKeys.length; index++) {
    const sku = allSkus[index]
    const songKey = allSongKeys[index]
    const variant = variantsBySku.get(sku)
    const metadata = (variant?.metadata || {}) as Record<string, unknown>

    if (metadata.djgabo_source !== "TIENDA_PISTAS_WEB") {
      badRequest("A requested variant does not belong to TIENDA_PISTAS_WEB")
    }

    if (
      normalizeDjgaboSongKey(String(metadata.djgabo_song_key || "")) !==
      songKey
    ) {
      badRequest("DJGABO song identity mismatch")
    }

    if (!variant?.digital_product?.id) {
      badRequest("A requested DJGABO variant is not linked to a digital product")
    }
  }

  const paidCount = paidSongKeys.length
  const freeCount = freeSongKeys.length
  const tariff = await fetchDjgaboPublicTariff(paidCount)
  const allocatedPrices = allocateTierTotal(tariff.precioTotal, paidCount)

  let promotion: DjgaboWebPromo | null = null
  if (freeCount > 0) {
    promotion = await fetchDjgaboPublicWebPromo({
      linkWeb: String(req.body?.promo?.link_web || ""),
    })

    if (!promotion.active) {
      badRequest("No active DJGABO PROMOS WEB promotion matches this request")
    }

    if (paidCount < promotion.minPaid) {
      badRequest(
        `DJGABO PROMOS WEB requires at least ${promotion.minPaid} paid tracks`
      )
    }

    if (freeCount > promotion.maxFree) {
      badRequest(
        `DJGABO PROMOS WEB allows at most ${promotion.maxFree} free tracks`
      )
    }
  }

  const paidItems = paidSongKeys.map((songKey, index) => {
    const sku = djgaboSkuFromSongKey(songKey)
    const variant = variantsBySku.get(sku)!
    const variantMetadata = (variant.metadata || {}) as Record<string, unknown>

    return {
      variant_id: variant.id,
      quantity: 1,
      unit_price: allocatedPrices[index],
      metadata: {
        djgabo_source: "TIENDA_PISTAS_WEB",
        djgabo_song_key: songKey,
        djgabo_drive_id: variantMetadata.djgabo_drive_id,
        djgabo_pricing_source: "06_PRECIOS_WEB",
        djgabo_paid_count: paidCount,
        djgabo_tier_total: tariff.precioTotal,
        djgabo_allocated_price: allocatedPrices[index],
        djgabo_is_promo_free: false,
        ...(promotion
          ? {
              djgabo_promo_source: promotion.source,
              djgabo_promo_code: promotion.code,
              djgabo_promo_min_paid: promotion.minPaid,
              djgabo_promo_max_free: promotion.maxFree,
              djgabo_promo_free_count: freeCount,
              djgabo_promo_link_web: promotion.linkWeb,
            }
          : {}),
      },
    }
  })

  const freeItems = freeSongKeys.map((songKey) => {
    const sku = djgaboSkuFromSongKey(songKey)
    const variant = variantsBySku.get(sku)!
    const variantMetadata = (variant.metadata || {}) as Record<string, unknown>

    return {
      variant_id: variant.id,
      quantity: 1,
      unit_price: 0,
      metadata: {
        djgabo_source: "TIENDA_PISTAS_WEB",
        djgabo_song_key: songKey,
        djgabo_drive_id: variantMetadata.djgabo_drive_id,
        djgabo_pricing_source: "06_PRECIOS_WEB",
        djgabo_paid_count: paidCount,
        djgabo_tier_total: tariff.precioTotal,
        djgabo_allocated_price: 0,
        djgabo_is_promo_free: true,
        djgabo_promo_source: promotion!.source,
        djgabo_promo_code: promotion!.code,
        djgabo_promo_min_paid: promotion!.minPaid,
        djgabo_promo_max_free: promotion!.maxFree,
        djgabo_promo_free_count: freeCount,
        djgabo_promo_link_web: promotion!.linkWeb,
      },
    }
  })

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cart.id,
      items: [...paidItems, ...freeItems],
    },
  })

  const {
    data: [updatedCart],
  } = await query.graph(
    {
      entity: "cart",
      fields: [
        "id",
        "currency_code",
        "subtotal",
        "total",
        "items.id",
        "items.variant_id",
        "items.unit_price",
        "items.quantity",
        "items.subtotal",
        "items.total",
        "items.metadata",
      ],
      filters: { id: cart.id },
    },
    { throwIfKeyNotFound: true }
  )

  res.status(200).json({
    cart: updatedCart,
    pricing: {
      source: "06_PRECIOS_WEB",
      paid_count: paidCount,
      free_count: freeCount,
      total_track_count: paidCount + freeCount,
      tier_total: tariff.precioTotal,
      allocated_prices: allocatedPrices,
    },
    promotion: promotion
      ? {
          source: promotion.source,
          segment: promotion.segment,
          code: promotion.code,
          min_paid: promotion.minPaid,
          max_free: promotion.maxFree,
          free_count: freeCount,
          link_web: promotion.linkWeb,
        }
      : null,
  })
}
