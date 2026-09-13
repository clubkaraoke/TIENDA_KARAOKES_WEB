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

type DjgaboTierCartBody = {
  items: Array<{
    song_key: string
  }>
}

const badRequest = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

export const POST = async (
  req: MedusaRequest<DjgaboTierCartBody>,
  res: MedusaResponse
) => {
  const requestedItems = Array.isArray(req.body?.items) ? req.body.items : []

  if (!requestedItems.length) {
    badRequest("At least one DJGABO paid track is required")
  }

  if (requestedItems.length > 50) {
    badRequest("DJGABO tier cart is limited to 50 paid tracks")
  }

  const songKeys = requestedItems.map((item) => {
    try {
      return normalizeDjgaboSongKey(item?.song_key || "")
    } catch {
      return ""
    }
  })

  if (songKeys.some((key) => !key)) {
    badRequest("Every DJGABO cart item requires song_key")
  }

  if (new Set(songKeys).size !== songKeys.length) {
    badRequest("The same DJGABO track cannot be added twice")
  }

  const skus = songKeys.map(djgaboSkuFromSongKey)
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
    filters: { sku: skus },
  })

  if (variants.length !== songKeys.length) {
    badRequest("One or more DJGABO tracks are not mapped in Medusa")
  }

  const variantsBySku = new Map(variants.map((variant) => [variant.sku, variant]))

  for (let index = 0; index < songKeys.length; index++) {
    const sku = skus[index]
    const variant = variantsBySku.get(sku)
    const metadata = (variant?.metadata || {}) as Record<string, unknown>

    if (metadata.djgabo_source !== "TIENDA_PISTAS_WEB") {
      badRequest("A requested variant does not belong to TIENDA_PISTAS_WEB")
    }

    if (
      normalizeDjgaboSongKey(String(metadata.djgabo_song_key || "")) !==
      songKeys[index]
    ) {
      badRequest("DJGABO song identity mismatch")
    }

    if (!variant?.digital_product?.id) {
      badRequest("A requested DJGABO variant is not linked to a digital product")
    }
  }

  const paidCount = songKeys.length
  const tariff = await fetchDjgaboPublicTariff(paidCount)
  const allocatedPrices = allocateTierTotal(tariff.precioTotal, paidCount)

  const items = songKeys.map((songKey, index) => {
    const variant = variantsBySku.get(skus[index])!
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
      },
    }
  })

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cart.id,
      items,
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
      tier_total: tariff.precioTotal,
      allocated_prices: allocatedPrices,
    },
  })
}
