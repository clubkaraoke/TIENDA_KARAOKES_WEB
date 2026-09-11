import { Metadata } from "next"

import KaraokeStorefront from "@modules/karaoke/components/karaoke-storefront"

export const metadata: Metadata = {
  title: "Karaokes TOP PERÚ | DJGABO",
  description:
    "Busca, prueba demos de 60 segundos y compra karaokes digitales DJGABO sin salir del catálogo.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return <KaraokeStorefront countryCode={countryCode} />
}
