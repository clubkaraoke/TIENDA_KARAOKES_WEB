import { Suspense } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"

const links = [
  { label: "INICIO", href: "/" },
  { label: "CATÁLOGO", href: "/#catalogo" },
  { label: "EXPLORAR", href: "/#explorar" },
  { label: "PACKS", href: "/store" },
]

export default async function Nav() {
  return (
    <div className="sticky top-0 inset-x-0 z-50 bg-white shadow-sm">
      <header className="border-b border-ui-border-base">
        <div className="content-container flex h-16 items-center justify-between gap-4">
          <LocalizedClientLink
            href="/"
            className="text-xl font-black tracking-tight"
            data-testid="nav-store-link"
          >
            DJGABO
          </LocalizedClientLink>

          <div className="flex items-center gap-5 text-sm">
            <LocalizedClientLink
              className="hidden font-medium hover:text-ui-fg-base small:block"
              href="/account"
              data-testid="nav-account-link"
            >
              CUENTA
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="font-semibold hover:text-ui-fg-base"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  🛒 0
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>

        <nav
          className="content-container flex min-h-11 items-center gap-x-5 overflow-x-auto whitespace-nowrap py-2 text-xs font-semibold tracking-wide text-ui-fg-subtle"
          aria-label="Navegación principal"
        >
          {links.map((link) => (
            <LocalizedClientLink
              key={`${link.label}-${link.href}`}
              href={link.href}
              className="hover:text-ui-fg-base"
            >
              {link.label}
            </LocalizedClientLink>
          ))}
        </nav>
      </header>
    </div>
  )
}
