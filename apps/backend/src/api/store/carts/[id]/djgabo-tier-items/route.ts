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
  djgaboSkuFromCatalogIdentity,
  djgaboSkuFromSongKey,
  normalizeDjgaboDriveId,
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
import {
  DjgaboStoreCatalogTrack,
  loadDjgaboStoreCatalogIndex,
  resolveDjgaboStoreCatalogTrack,
} from "../../../../../lib/djgabo-store-catalog"
import { ensureDjgaboCatalogVariants } from "../../../../../lib/djgabo-on-demand-provision"

type DjgaboSongRequest = {
  song_key: string
  drive_id?: string
}

type DjgaboTierCartBody = {
  items: DjgaboSongRequest[]
  free_items?: DjgaboSongRequest[]
  promo?: {
    link_web?: string
  }
}

type RequestedTrack = {
  songKey: string
  driveId: string
  sku: string
  identity: string
  catalogBacked: boolean
}

const badRequest = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

const normalizeRequestedTracks = (
  items: DjgaboSongRequest[],
  label: string
): RequestedTrack[] => {
  const tracks = items.map((item) => {
    let songKey = ""
    try {
      songKey = normalizeDjgaboSongKey(item?.song_key || "")
    } catch {
      badRequest(`Every DJGABO ${label} item requires song_key`)
    }

    const rawDriveId = String(item?.drive_id || "").trim()
    if (!rawDriveId) {
      return {
        songKey,
        driveId: "",
        sku: djgaboSkuFromSongKey(songKey),
        identity: `legacy:${songKey}`,
        catalogBacked: false,
      }
    }

    let driveId = ""
    try {
      driveId = normalizeDjgaboDriveId(rawDriveId)
    } catch {
      badRequest(`Every DJGABO ${label} drive_id must be valid`)
    }

    return {
      songKey,
      driveId,
      sku: djgaboSkuFromCatalogIdentity(songKey, driveId),
      identity: `catalog:${songKey}\n${driveId}`,
      catalogBacked: true,
    }
  })

  if (new Set(tracks.map((track) => track.identity)).size !== tracks.length) {
    badRequest(`The same DJGABO ${label} track cannot be added twice`)
  }

  return tracks
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

  const paidTracks = normalizeRequestedTracks(requestedPaidItems, "paid")
  const freeTracks = normalizeRequestedTracks(requestedFreeItems, "free")
  const allTracks = [...paidTracks, ...freeTracks]

  if (new Set(allTracks.map((track) => track.identity)).size !== allTracks.length) {
    badRequest("A DJGABO track cannot be both paid and promotional free")
  }

  const allSkus = allTracks.map((track) => track.sku)
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

  let { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "metadata", "digital_product.id"],
    filters: { sku: allSkus },
  })

  const initiallyMappedSkus = new Set(variants.map((variant) => variant.sku))
  const missingLegacy = allTracks.filter(
    (track) => !track.catalogBacked && !initiallyMappedSkus.has(track.sku)
  )
  if (missingLegacy.length) {
    badRequest("One or more legacy DJGABO tracks are not mapped in Medusa")
  }

  const catalogTracks = allTracks.filter((track) => track.catalogBacked)
  const trustedBySku = new Map<string, DjgaboStoreCatalogTrack>()
  if (catalogTracks.length) {
    let catalogIndex
    try {
      catalogIndex = await loadDjgaboStoreCatalogIndex()
    } catch {
      badRequest("DJGABO trusted catalog is temporarily unavailable")
    }

    for (const track of catalogTracks) {
      try {
        trustedBySku.set(
          track.sku,
          resolveDjgaboStoreCatalogTrack(
            catalogIndex!,
            track.songKey,
            track.driveId
          )
        )
      } catch {
        badRequest("One or more DJGABO tracks do not match the trusted catalog")
      }
    }

    const missingCatalogTracks = catalogTracks
      .filter((track) => !initiallyMappedSkus.has(track.sku))
      .map((track) => trustedBySku.get(track.sku)!)

    if (missingCatalogTracks.length) {
      try {
        await ensureDjgaboCatalogVariants(req.scope, missingCatalogTracks)
      } catch {
        badRequest("DJGABO catalog track provisioning failed safely")
      }
    }

    ;({ data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "metadata", "digital_product.id"],
      filters: { sku: allSkus },
    }))
  }

  if (variants.length !== allTracks.length) {
    badRequest("One or more DJGABO tracks are not mapped in Medusa")
  }

  const variantsBySku = new Map(variants.map((variant) => [variant.sku, variant]))

  for (const track of allTracks) {
    const variant = variantsBySku.get(track.sku)
    const metadata = (variant?.metadata || {}) as Record<string, unknown>

    if (metadata.djgabo_source !== "TIENDA_PISTAS_WEB") {
      badRequest("A requested variant does not belong to TIENDA_PISTAS_WEB")
    }

    if (
      normalizeDjgaboSongKey(String(metadata.djgabo_song_key || "")) !==
      track.songKey
    ) {
      badRequest("DJGABO song identity mismatch")
    }

    if (track.catalogBacked) {
      if (String(metadata.djgabo_drive_id || "") !== track.driveId) {
        badRequest("DJGABO Drive identity mismatch")
      }
      if (Number(metadata.djgabo_catalog_identity_version || 0) !== 2) {
        badRequest("DJGABO catalog identity version mismatch")
      }
    }

    if (!variant?.digital_product?.id) {
      badRequest("A requested DJGABO variant is not linked to a digital product")
    }
  }

  const paidCount = paidTracks.length
  const freeCount = freeTracks.length
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

  const paidItems = paidTracks.map((track, index) => {
    const variant = variantsBySku.get(track.sku)!
    const variantMetadata = (variant.metadata || {}) as Record<string, unknown>

    return {
      variant_id: variant.id,
      quantity: 1,
      unit_price: allocatedPrices[index],
      metadata: {
        djgabo_source: "TIENDA_PISTAS_WEB",
        djgabo_song_key: track.songKey,
        djgabo_drive_id: variantMetadata.djgabo_drive_id,
        djgabo_pricing_source: "06_PRECIOS_WEB",
        djgabo_paid_count: paidCount,
        djgabo_tier_total: tariff.precioTotal,
        djgabo_allocated_price: allocatedPrices[index],
        djgabo_is_promo_free: false,
        ...(track.catalogBacked
          ? { djgabo_catalog_identity_version: 2 }
          : {}),
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

  const freeItems = freeTracks.map((track) => {
    const variant = variantsBySku.get(track.sku)!
    const variantMetadata = (variant.metadata || {}) as Record<string, unknown>

    return {
      variant_id: variant.id,
      quantity: 1,
      unit_price: 0,
      metadata: {
        djgabo_source: "TIENDA_PISTAS_WEB",
        djgabo_song_key: track.songKey,
        djgabo_drive_id: variantMetadata.djgabo_drive_id,
        djgabo_pricing_source: "06_PRECIOS_WEB",
        djgabo_paid_count: paidCount,
        djgabo_tier_total: tariff.precioTotal,
        djgabo_allocated_price: 0,
        djgabo_is_promo_free: true,
        ...(track.catalogBacked
          ? { djgabo_catalog_identity_version: 2 }
          : {}),
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
