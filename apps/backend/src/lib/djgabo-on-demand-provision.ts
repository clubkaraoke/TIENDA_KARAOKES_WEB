import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  djgaboSkuFromCatalogIdentity,
  normalizeDjgaboSongKey,
} from "./djgabo-catalog"
import { DjgaboStoreCatalogTrack } from "./djgabo-store-catalog"
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product"
import DigitalProductModuleService from "../modules/digital-product/service"

const SOURCE = "TIENDA_PISTAS_WEB"
const CATALOG_SOURCE = "catalogo.min.json"

function assertExistingVariantMatchesTrack(
  variant: any,
  track: DjgaboStoreCatalogTrack,
  sku: string
): void {
  const metadata = (variant?.metadata || {}) as Record<string, unknown>
  if (metadata.djgabo_source !== SOURCE) {
    throw new Error(`Existing DJGABO2 SKU has invalid source: ${sku}`)
  }
  if (
    normalizeDjgaboSongKey(String(metadata.djgabo_song_key || "")) !==
    track.normalizedSongKey
  ) {
    throw new Error(`Existing DJGABO2 SKU has song identity mismatch: ${sku}`)
  }
  if (String(metadata.djgabo_drive_id || "") !== track.driveId) {
    throw new Error(`Existing DJGABO2 SKU has Drive identity mismatch: ${sku}`)
  }
  if (Number(metadata.djgabo_catalog_identity_version || 0) !== 2) {
    throw new Error(`Existing DJGABO2 SKU has invalid identity version: ${sku}`)
  }
  if (!variant?.digital_product?.id) {
    throw new Error(`Existing DJGABO2 SKU is not linked to a digital product: ${sku}`)
  }
}

export async function ensureDjgaboCatalogVariants(
  container: any,
  tracks: DjgaboStoreCatalogTrack[]
): Promise<void> {
  if (!Array.isArray(tracks) || !tracks.length) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const lockingService = container.resolve(Modules.LOCKING)
  const digitalProductService: DigitalProductModuleService = container.resolve(
    DIGITAL_PRODUCT_MODULE
  )

  const unique = new Map<string, DjgaboStoreCatalogTrack>()
  for (const track of tracks) {
    const sku = djgaboSkuFromCatalogIdentity(track.songKey, track.driveId)
    const previous = unique.get(sku)
    if (
      previous &&
      (previous.normalizedSongKey !== track.normalizedSongKey ||
        previous.driveId !== track.driveId)
    ) {
      throw new Error(`DJGABO2 SKU collision detected: ${sku}`)
    }
    unique.set(sku, track)
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "Default Sales Channel" },
  })
  if (salesChannels.length !== 1) {
    throw new Error(
      `Expected exactly one Default Sales Channel, got ${salesChannels.length}`
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    filters: { name: "Digital" },
  })
  if (shippingProfiles.length !== 1) {
    throw new Error(
      `Expected exactly one audited Digital shipping profile, got ${shippingProfiles.length}`
    )
  }

  const salesChannelId = salesChannels[0].id
  const shippingProfileId = shippingProfiles[0].id
  const ordered = [...unique.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [sku, track] of ordered) {
    const lockKey = `djgabo:catalog-provision:${sku}`
    let acquired = false
    try {
      await lockingService.acquire(lockKey, { expire: 60 })
      acquired = true

      const { data: found } = await query.graph({
        entity: "variant",
        fields: ["id", "sku", "metadata", "digital_product.id"],
        filters: { sku },
      })

      if (found.length > 1) {
        throw new Error(`Duplicate DJGABO2 SKU detected: ${sku}`)
      }
      if (found.length === 1) {
        assertExistingVariantMatchesTrack(found[0], track, sku)
        logger.info(`DJGABO_ON_DEMAND_EXISTS_OK ${sku}`)
        continue
      }

      const metadata = {
        djgabo_source: SOURCE,
        djgabo_song_key: track.songKey,
        djgabo_drive_id: track.driveId,
        djgabo_catalog_source: CATALOG_SOURCE,
        djgabo_catalog_identity_version: 2,
        djgabo_provisioning: "on_demand",
      }

      const { result: products } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: track.title || track.songKey,
              subtitle: track.artist || undefined,
              handle: `djgabo-${sku.toLowerCase()}`,
              status: ProductStatus.PUBLISHED,
              shipping_profile_id: shippingProfileId,
              metadata,
              options: [
                {
                  title: "Formato",
                  values: ["Pista Digital"],
                },
              ],
              variants: [
                {
                  title: "Pista Digital",
                  sku,
                  options: { Formato: "Pista Digital" },
                  manage_inventory: false,
                  metadata,
                  prices: [
                    {
                      amount: 15,
                      currency_code: "pen",
                    },
                  ],
                },
              ],
              sales_channels: [{ id: salesChannelId }],
            },
          ],
        },
      })

      const variant = products[0]?.variants?.[0]
      if (!variant?.id) {
        throw new Error(`On-demand product was created without a variant: ${sku}`)
      }

      const digitalProduct = await digitalProductService.createDigitalProducts({
        name: `${track.title || track.songKey}${track.artist ? ` — ${track.artist}` : ""}`,
      })

      await link.create({
        [DIGITAL_PRODUCT_MODULE]: {
          digital_product_id: digitalProduct.id,
        },
        [Modules.PRODUCT]: {
          product_variant_id: variant.id,
        },
      })

      const { data: verified } = await query.graph({
        entity: "variant",
        fields: ["id", "sku", "metadata", "digital_product.id"],
        filters: { sku },
      })
      if (verified.length !== 1) {
        throw new Error(`On-demand verification expected one variant: ${sku}`)
      }
      assertExistingVariantMatchesTrack(verified[0], track, sku)
      logger.info(`DJGABO_ON_DEMAND_CREATED_OK ${sku}`)
    } finally {
      if (acquired) {
        await lockingService.release(lockKey)
      }
    }
  }
}
