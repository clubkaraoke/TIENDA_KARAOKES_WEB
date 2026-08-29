import { Button, Heading } from "@modules/common/components/ui"

const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b border-ui-border-base bg-[#160b2d] text-white">
      <div className="content-container flex min-h-[420px] flex-col items-start justify-center gap-6 py-16 small:min-h-[520px] small:py-24">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-purple-200">
            Club Karaoke DJGABO
          </p>
          <Heading
            level="h1"
            className="text-4xl font-semibold leading-tight text-white small:text-6xl"
          >
            Tu karaoke listo para cantar y descargar
          </Heading>
          <p className="mt-5 max-w-2xl text-base leading-7 text-purple-100 small:text-lg">
            Busca tu canción, escucha la demo y agrégala a tu cuenta. Cuando el MP4 esté listo,
            quedará disponible en Mis Karaokes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="#catalogo-karaoke">
            <Button>Ver karaokes</Button>
          </a>
          <a href="/account">
            <Button variant="secondary">Mi cuenta</Button>
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
