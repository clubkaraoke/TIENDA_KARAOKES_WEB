import {
  fetchDjgaboPublicWebPromo,
  normalizeDjgaboPromoLinkSlug,
  selectDjgaboWebPromo,
} from "../djgabo-promo"

describe("DJGABO PROMOS WEB", () => {
  describe("normalizeDjgaboPromoLinkSlug", () => {
    it.each([
      ["", ""],
      ["meta", "meta"],
      ["?p=Meta", "meta"],
      ["p=META", "meta"],
      ["https://tienda.kitkaraoke.com/?p=promo-3free", "promo-3free"],
    ])("normalizes %s to %s", (input, expected) => {
      expect(normalizeDjgaboPromoLinkSlug(input)).toBe(expected)
    })
  })

  describe("selectDjgaboWebPromo", () => {
    it("parses a normal PUBLICO promo with blank LINK_WEB", () => {
      const promo = selectDjgaboWebPromo(
        {
          active: true,
          pistasGratis: 2,
          minCompra: 3,
          codigoPromo: "PROMO_3FREE_2COMPRA",
          linkWeb: "",
        },
        { segment: "PUBLICO", linkWeb: "" }
      )

      expect(promo).toEqual({
        active: true,
        segment: "PUBLICO",
        code: "PROMO_3FREE_2COMPRA",
        maxFree: 2,
        minPaid: 3,
        linkWeb: undefined,
        source: "PROMOS_WEB",
      })
    })

    it("parses a linked PUBLICO campaign when LINK_WEB matches", () => {
      const promo = selectDjgaboWebPromo(
        {
          activo: "SI",
          PISTAS_GRATIS: "2",
          MIN_COMPRA: "3",
          CODIGO_PROMO: "PROMO_META",
          LINK_WEB: "meta",
        },
        { segment: "PUBLICO", linkWeb: "meta" }
      )

      expect(promo).toEqual({
        active: true,
        segment: "PUBLICO",
        code: "PROMO_META",
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
          { segment: "PUBLICO", linkWeb: "" }
        )
      ).toMatchObject({ active: false, maxFree: 0, minPaid: 0, code: "PROMO_OFF" })
    })

    it("fails closed when an active promo has malformed limits", () => {
      expect(() =>
        selectDjgaboWebPromo(
          { activo: "SI", pistasGratis: "bad", minimoCompra: 2 },
          { segment: "PUBLICO", linkWeb: "" }
        )
      ).toThrow("Invalid DJGABO PROMOS WEB free-track limit")
    })

    it("deactivates a PUBLICO promo when LINK_WEB does not match", () => {
      expect(
        selectDjgaboWebPromo(
          { activo: "SI", pistasGratis: 2, minimoCompra: 3, linkWeb: "instagram" },
          { segment: "PUBLICO", linkWeb: "meta" }
        )
      ).toMatchObject({ active: false, maxFree: 0, minPaid: 0 })
    })

    it("does not expose a linked campaign to a normal blank-link visit", () => {
      expect(
        selectDjgaboWebPromo(
          { activo: "SI", pistasGratis: 1, minimoCompra: 1, linkWeb: "meta" },
          { segment: "PUBLICO", linkWeb: "" }
        )
      ).toMatchObject({ active: false, maxFree: 0, minPaid: 0 })
    })
  })

  describe("fetchDjgaboPublicWebPromo", () => {
    const normalPromoPayload = {
      active: true,
      segmento: "PUBLICO",
      pistasGratis: 2,
      minCompra: 3,
      codigoPromo: "PROMO_3FREE_2COMPRA",
      linkWeb: "",
    }

    const okResponse = (payload: Record<string, unknown>) =>
      ({ ok: true, status: 200, json: async () => payload }) as Response

    it("queries normal PUBLICO without link_web and returns the live promo", async () => {
      const fetchImpl = jest.fn(async (input: any) => {
        const url = new URL(String(input))
        expect(url.searchParams.get("tipo")).toBe("promo_web")
        expect(url.searchParams.get("segmento")).toBe("PUBLICO")
        expect(url.searchParams.has("link_web")).toBe(false)
        return okResponse(normalPromoPayload)
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicWebPromo({
          fetchImpl,
          promoApiUrl: "https://example.invalid/exec",
          maxAttempts: 1,
        })
      ).resolves.toMatchObject({
        active: true,
        code: "PROMO_3FREE_2COMPRA",
        maxFree: 2,
        minPaid: 3,
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it("queries a linked campaign with link_web", async () => {
      const fetchImpl = jest.fn(async (input: any) => {
        const url = new URL(String(input))
        expect(url.searchParams.get("link_web")).toBe("meta")
        return okResponse({
          activo: "SI",
          pistasGratis: 1,
          minCompra: 1,
          codigoPromo: "PROMO_META",
          linkWeb: "meta",
        })
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicWebPromo({
          fetchImpl,
          promoApiUrl: "https://example.invalid/exec",
          linkWeb: "meta",
          maxAttempts: 1,
        })
      ).resolves.toMatchObject({ active: true, code: "PROMO_META", linkWeb: "meta" })
    })

    it("retries one transient timeout and then succeeds", async () => {
      let calls = 0
      const fetchImpl = jest.fn(async () => {
        calls += 1
        if (calls === 1) {
          const error = new Error("aborted")
          error.name = "AbortError"
          throw error
        }
        return okResponse(normalPromoPayload)
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicWebPromo({
          fetchImpl,
          promoApiUrl: "https://example.invalid/exec",
          timeoutMs: 100,
          maxAttempts: 2,
        })
      ).resolves.toMatchObject({ active: true, code: "PROMO_3FREE_2COMPRA" })

      expect(calls).toBe(2)
    })

    it("retries one transient 5xx and then succeeds", async () => {
      let calls = 0
      const fetchImpl = jest.fn(async () => {
        calls += 1
        if (calls === 1) {
          return { ok: false, status: 503, json: async () => ({}) } as Response
        }
        return okResponse(normalPromoPayload)
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicWebPromo({
          fetchImpl,
          promoApiUrl: "https://example.invalid/exec",
          maxAttempts: 2,
        })
      ).resolves.toMatchObject({ active: true, code: "PROMO_3FREE_2COMPRA" })

      expect(calls).toBe(2)
    })

    it("rejects unsafe retry counts before making a request", async () => {
      const fetchImpl = jest.fn(async () => okResponse(normalPromoPayload)) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicWebPromo({
          fetchImpl,
          promoApiUrl: "https://example.invalid/exec",
          maxAttempts: 4,
        })
      ).rejects.toThrow("maxAttempts must be between 1 and 3")

      expect(fetchImpl).not.toHaveBeenCalled()
    })
  })
})