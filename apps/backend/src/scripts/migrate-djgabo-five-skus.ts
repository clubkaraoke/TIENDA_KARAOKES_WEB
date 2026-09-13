import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import {
  djgaboSkuFromSongKey,
  normalizeDjgaboSongKey,
} from "../lib/djgabo-catalog"

type TrackSkuMigration = {
  oldSku: string
  songKey: string
  driveId: string
}

const MIGRATIONS: TrackSkuMigration[] = [
  {
    oldSku: "DJGABO-8FB91920052EB17A9A23",
    songKey: "Alza Tu Mano Y Pide La Palabra :: Maria Yfeu",
    driveId: "1MQAA-gRfZRipqeADNKoJSeMNqrmmadWI",
  },
  {
    oldSku: "DJGABO-AD2E2C4846194E3C47C0",
    songKey: "Amé Una Vez :: Agustín Lara",
    driveId: "1kQEBZqj-yWaDOFkJA0FB_S7ETAsC0UUy",
  },
  {
    oldSku: "DJGABO-5BE261DA8C63ACFC184F",
    songKey: "El Hombre Que Más Te Amó :: Vicente Fernández",
    driveId: "1lzILSIvXg56IpE-v-5TKrRplPdhkZiXk",
  },
  {
    oldSku: "DJGABO-9DA4A0FAEA1583D96C6C",
    songKey: "Enterram3 En El Après Maríe :: Leiva",
    driveId: "1bnkA4f75MEUsFxi-xOXD_cg5obfpNsCr",
  },
  {
    oldSku: "DJGABO-07117112562316112A18",
    songKey: "La Sencillita :: Christian Herrera Y Matacos",
    driveId: "1J-CtYUiI7NDE2pDhwFfOPqvhFgf8Pb_h",
  },
]

function validateTrackVariant(
  variant: any,
  track: TrackSkuMigration,
  expectedSku: string
) {
  const metadata = (variant?.metadata || {}) as Record<string, unknown>

  if (metadata.djgabo_source !== "TIENDA_PISTAS_WEB") {
    throw new Error(`Refusing SKU migration: invalid source for ${variant?.id}`)
  }

  if (
    normalizeDjgaboSongKey(String(metadata.djgabo_song_key || "")) !==
    normalizeDjgaboSongKey(track.songKey)
  ) {
    throw new Error(`Refusing SKU migration: song identity mismatch for ${variant?.id}`)
  }

  if (metadata.djgabo_drive_id !== track.driveId) {
    throw new Error(`Refusing SKU migration: Drive ID mismatch for ${variant?.id}`)
  }

  if (!variant?.digital_product?.id) {
    throw new Error(`Refusing SKU migration: missing digital link for ${variant?.id}`)
  }

  if (djgaboSkuFromSongKey(track.songKey) !== expectedSku) {
    throw new Error(`Canonical SKU calculation changed for ${track.songKey}`)
  }
}

export default async function migrateDjgaboFiveSkus({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Migrating exactly five DJGABO test-catalog SKUs to canonical songKey hashes...")

  for (const track of MIGRATIONS) {
    const expectedSku = djgaboSkuFromSongKey(track.songKey)

    const { data: oldMatches } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "metadata", "digital_product.id"],
      filters: { sku: track.oldSku },
    })

    const { data: canonicalMatches } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "metadata", "digital_product.id"],
      filters: { sku: expectedSku },
    })

    if (oldMatches.length > 1 || canonicalMatches.length > 1) {
      throw new Error(`Duplicate SKU state detected for ${track.songKey}`)
    }

    if (canonicalMatches.length === 1) {
      if (oldMatches.length) {
        throw new Error(
          `Both legacy and canonical SKUs exist for ${track.songKey}; refusing to continue`
        )
      }
      validateTrackVariant(canonicalMatches[0], track, expectedSku)
      logger.info(`SKU_ALREADY_OK ${expectedSku}`)
      continue
    }

    if (oldMatches.length !== 1) {
      throw new Error(
        `Expected exactly one legacy SKU ${track.oldSku}, got ${oldMatches.length}`
      )
    }

    validateTrackVariant(oldMatches[0], track, expectedSku)

    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            id: oldMatches[0].id,
            sku: expectedSku,
          },
        ],
      },
    })

    logger.info(`SKU_MIGRATED ${track.oldSku} -> ${expectedSku}`)
  }

  for (const track of MIGRATIONS) {
    const expectedSku = djgaboSkuFromSongKey(track.songKey)
    const { data: oldMatches } = await query.graph({
      entity: "variant",
      fields: ["id"],
      filters: { sku: track.oldSku },
    })
    if (oldMatches.length) {
      throw new Error(`Legacy SKU still exists after migration: ${track.oldSku}`)
    }

    const { data: canonicalMatches } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "metadata", "digital_product.id"],
      filters: { sku: expectedSku },
    })
    if (canonicalMatches.length !== 1) {
      throw new Error(
        `Verification expected exactly one canonical SKU ${expectedSku}, got ${canonicalMatches.length}`
      )
    }
    validateTrackVariant(canonicalMatches[0], track, expectedSku)
  }

  logger.info(`DJGABO_FIVE_SKUS_MIGRATED=${MIGRATIONS.length}`)
}
