import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product"
import DigitalProductModuleService from "../modules/digital-product/service"

type Track = {
  songKey: string
  sku: string
  title: string
  artist: string
  driveId: string
}

const TRACKS: Track[] = [
  {
    songKey: "Alza Tu Mano Y Pide La Palabra :: Maria Yfeu",
    sku: "DJGABO-8FB91920052EB17A9A23",
    title: "Alza Tu Mano Y Pide La Palabra",
    artist: "Maria Yfeu",
    driveId: "1MQAA-gRfZRipqeADNKoJSeMNqrmmadWI",
  },
  {
    songKey: "Amé Una Vez :: Agustín Lara",
    sku: "DJGABO-AD2E2C4846194E3C47C0",
    title: "Amé Una Vez",
    artist: "Agustín Lara",
    driveId: "1kQEBZqj-yWaDOFkJA0FB_S7ETAsC0UUy",
  },
  {
    songKey: "El Hombre Que Más Te Amó :: Vicente Fernández",
    sku: "DJGABO-5BE261DA8C63ACFC184F",
    title: "El Hombre Que Más Te Amó",
    artist: "Vicente Fernández",
    driveId: "1lzILSIvXg56IpE-v-5TKrRplPdhkZiXk",
  },
  {
    songKey: "Enterram3 En El Après Maríe :: Leiva",
    sku: "DJGABO-9DA4A0FAEA1583D96C6C",
    title: "Enterram3 En El Après Maríe",
    artist: "Leiva",
    driveId: "1bnkA4f75MEUsFxi-xOXD_cg5obfpNsCr",
  },
  {
    songKey: "La Sencillita :: Christian Herrera Y Matacos",
    sku: "DJGABO-07117112562316112A18",
    title: "La Sencillita",
    artist: "Christian Herrera Y Matacos",
    driveId: "1J-CtYUiI7NDE2pDhwFfOPqvhFgf8Pb_h",
  },
]

export default async function provisionDjgaboFiveTracks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const digitalProductService: DigitalProductModuleService = container.resolve(
    DIGITAL_PRODUCT_MODULE
  )

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
    filters: { name: "Digital Shipping Profile" },
  })
  if (shippingProfiles.length !== 1) {
    throw new Error(
      `Expected exactly one Digital Shipping Profile, got ${shippingProfiles.length}`
    )
  }

  const salesChannelId = salesChannels[0].id
  const shippingProfileId = shippingProfiles[0].id

  logger.info("Provisioning exactly five DJGABO real tracks...")

  for (const track of TRACKS) {
    const { data: found } = await query.graph({
      entity: "variant",
      fields: ["id", "sku", "metadata", "digital_product.id"],
      filters: { sku: track.sku },
    })

    if (found.length > 1) {
      throw new Error(`Duplicate SKU detected before provisioning: ${track.sku}`)
    }

    if (found.length === 1) {
      const variant = found[0]
      const metadata = (variant.metadata || {}) as Record<string, unknown>
      if (
        metadata.djgabo_source !== "TIENDA_PISTAS_WEB" ||
        metadata.djgabo_song_key !== track.songKey ||
        metadata.djgabo_drive_id !== track.driveId ||
        !variant.digital_product?.id
      ) {
        throw new Error(
          `Existing SKU is incomplete or mismatched; refusing to mutate: ${track.sku}`
        )
      }
      logger.info(`EXISTS_OK ${track.sku}`)
      continue
    }

    const { result: products } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: track.title,
            subtitle: track.artist,
            handle: `djgabo-${track.sku.toLowerCase()}`,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfileId,
            metadata: {
              djgabo_source: "TIENDA_PISTAS_WEB",
              djgabo_song_key: track.songKey,
              djgabo_drive_id: track.driveId,
              djgabo_test_catalog: true,
            },
            options: [
              {
                title: "Formato",
                values: ["Pista Digital"],
              },
            ],
            variants: [
              {
                title: "Pista Digital",
                sku: track.sku,
                options: { Formato: "Pista Digital" },
                manage_inventory: false,
                metadata: {
                  djgabo_source: "TIENDA_PISTAS_WEB",
                  djgabo_song_key: track.songKey,
                  djgabo_drive_id: track.driveId,
                  djgabo_test_catalog: true,
                },
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
      throw new Error(`Product was created without a variant: ${track.sku}`)
    }

    const digitalProduct = await digitalProductService.createDigitalProducts({
      name: `${track.title} — ${track.artist}`,
    })

    await link.create({
      [DIGITAL_PRODUCT_MODULE]: {
        digital_product_id: digitalProduct.id,
      },
      [Modules.PRODUCT]: {
        product_variant_id: variant.id,
      },
    })

    logger.info(`CREATED_OK ${track.sku}`)
  }

  const skus = TRACKS.map((track) => track.sku)
  const { data: verified } = await query.graph({
    entity: "variant",
    fields: [
      "id",
      "sku",
      "metadata",
      "product.id",
      "product.title",
      "digital_product.id",
      "digital_product.name",
    ],
    filters: { sku: skus },
  })

  if (verified.length !== TRACKS.length) {
    throw new Error(
      `Verification expected ${TRACKS.length} variants, got ${verified.length}`
    )
  }

  for (const track of TRACKS) {
    const variant = verified.find((item) => item.sku === track.sku)
    const metadata = (variant?.metadata || {}) as Record<string, unknown>
    if (
      !variant?.digital_product?.id ||
      metadata.djgabo_source !== "TIENDA_PISTAS_WEB" ||
      metadata.djgabo_song_key !== track.songKey ||
      metadata.djgabo_drive_id !== track.driveId
    ) {
      throw new Error(`Verification failed for ${track.sku}`)
    }
  }

  logger.info(`DJGABO_FIVE_TRACKS_VERIFIED=${verified.length}`)
}
