import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Mis Karaokes | Club Karaoke DJGABO",
  description: "Karaokes comprados y disponibles en la cuenta del cliente.",
}

export default async function MyKaraokesPage() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="my-karaokes-page">
      <div className="mb-8">
        <h1 className="text-2xl-semi">Mis Karaokes</h1>
        <p className="mt-2 text-ui-fg-subtle">
          Aquí aparecerán los karaokes comprados y disponibles para reproducir o descargar.
        </p>
      </div>

      <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-6">
        <p className="font-medium">Todavía no hay karaokes disponibles.</p>
        <p className="mt-2 text-sm text-ui-fg-subtle">
          La siguiente conexión será la entrega digital asociada al ID_CANCION.
        </p>
      </div>
    </div>
  )
}
