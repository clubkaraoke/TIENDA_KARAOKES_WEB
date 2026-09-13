import {
  fetchDjgaboPublicWebPromo,
  normalizeDjgaboPromoLinkSlug,
  selectDjgaboWebPromo,
} from "../djgabo-promo"

describe("DJGABO PROMOS WEB", () => {
  describe("normalizeDjgaboPromoLinkSlug", () => {
    it.each([
      ["meta", "meta"],
      ["?p=Meta", "meta"],
      ["p=META", "meta"],
      ["https://tienda.kitkaraoke.com/?p=promo-3free", "promo-3free"],
    ])("normalizes %s to %s", (input, expected) => {
      expect(normalizeDjgaboPromoLinkSlug(input)).toBe(expected)
    })
  })

  describe("selectDjgaboWebPromo", () => {
    it("parses the same active fields used by TIENDA_PISTAS_WEB", () => {
      const promo = selectDjgaboWebPromo(
        {
          activo: "SI",
          PISTAS_GRATIS: "2",
          MIN_COMPRA: "3",
          CODIGO_PROMO: "PROMO_3FREE_2COMPRA",
          LINK_WEB: "meta",
        },
        { segment: "PUBLICO", linkWeb: "meta" }
      )

      expect(promo).toEqual({
        active: true,
        segment: "PUBLICO",
        code: "PROMO_3FREE_2COMPRA",
        maxFree: 2,
        minPaid: 3,
        linkWeb: "meta",
        source: "PROMOS_WEB",
      })
    })

    it("keeps an inactive Sheet promotion inactive", () => {
      expect(
        selectDjgaboWebPromo(
          {
            activo: "NO",
            pistasGratis: 3,
            minimoCompra: 2,
            codigoPromo: "PROMO_OFF",
          },
          { segment: "PUBLICO", linkWeb: "meta" }
        )
      ).toMatchObject({
        active: false,
        maxFree: 0,
        minPaid: 0,
        code: "PROMO_OFF",
      })
    })

    it("fails closed when an active promo has malformed limits", () => {
      expect(() =>
        selectDjgaboWebPromo(
          {
            activo: "SI",
            pistasGratis: "bad",
            minimoCompra: 2,
          },
          { segment: "PUBLICO", linkWeb: "meta" }
        )
      ).toThrow("Invalid DJGABO PROMOS WEB free-track limit")
    })

    it("deactivates a PUBLICO promo when LINK_WEB does not match", () => {
      expect(
        selectDjgaboWebPromo(
          {
            activo: "SI",
            pistasGratis: 2,
            minimoCompra: 3,
            linkWeb: "instagram",
          },
          { segment: "PUBLICO", linkWeb: "meta" }
        )
      ).toMatchObject({
        active: false,
        maxFree: 0,
        minPaid: 0,
      })
    })
  })

  describe("fetchDjgaboPublicWebPromo", () => {
    it("does not expose a PUBLICO promo without the same ?p= link used by the storefront", async () => {
      const fetchImpl = jest.fn()

      const promo = await fetchDjgaboPublicWebPromo({
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })

      expect(fetchImpl).not.toHaveBeenCalled()
      expect(promo).toMatchObject({
        active: false,
        segment: "PUBLICO",
        maxFree: 0,
      })
    })

    it("queries promo_web and returns the live Sheet limits", async () => {
      const fetchImpl = jest.fn(async (input: any) => {
        const url = new URL(String(input))
        expect(url.searchParams.get("tipo")).toBe("promo_web")
        expect(url.searchParams.get("segmento")).toBe("PUBLICO")
        expect(url.searchParams.get("link_web")).toBe("meta")

        return {
          ok: true,
          json: async () => ({
            activo: "SI",
            pistasGratis: 2,
            minCompra: 3,
            codigoPromo: "PROMO_META",
            linkWeb: "meta",
          }),
        } as Response
      })

      const promo = await fetchDjgaboPublicWebPromo({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        promoApiUrl: "https://example.invalid/exec",
        linkWeb: "meta",
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(promo).toMatchObject({
        active: true,
        code: "PROMO_META",
        maxFree: 2,
        minPaid: 3,
        linkWeb: "meta",
      })
    })
  })
})
