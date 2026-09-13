import {
  djgaboSkuFromSongKey,
  normalizeDjgaboSongKey,
} from "../djgabo-catalog"
import {
  allocateTierTotal,
  fetchDjgaboPublicTariff,
  selectDjgaboTariff,
} from "../djgabo-pricing"

describe("DJGABO catalog identity", () => {
  it("normalizes accents, case and whitespace deterministically", () => {
    expect(normalizeDjgaboSongKey("  Amé   Una Vez :: Agustín Lara  ")).toBe(
      "ame una vez :: agustin lara"
    )
  })

  it.each([
    [
      "Alza Tu Mano Y Pide La Palabra :: Maria Yfeu",
      "DJGABO-B7141398907E42C8A0AA",
    ],
    ["Amé Una Vez :: Agustín Lara", "DJGABO-31431D8DCA01EFCF7BCA"],
    [
      "El Hombre Que Más Te Amó :: Vicente Fernández",
      "DJGABO-06F8F96607073C5A68C7",
    ],
    [
      "Enterram3 En El Après Maríe :: Leiva",
      "DJGABO-D1EF8C0ACA57B034C08B",
    ],
    [
      "La Sencillita :: Christian Herrera Y Matacos",
      "DJGABO-04D474F5C252ECA20372",
    ],
  ])("maps %s to its canonical SKU", (songKey, expectedSku) => {
    expect(djgaboSkuFromSongKey(songKey)).toBe(expectedSku)
  })
})

describe("DJGABO tier pricing", () => {
  describe("allocateTierTotal", () => {
    it("keeps one paid track at S/15", () => {
      expect(allocateTierTotal(15, 1)).toEqual([15])
    })

    it("allocates S/25 exactly across two paid tracks", () => {
      const prices = allocateTierTotal(25, 2)
      expect(prices).toEqual([13, 12])
      expect(prices.reduce((sum, price) => sum + price, 0)).toBe(25)
    })

    it("allocates S/32 exactly across three paid tracks", () => {
      const prices = allocateTierTotal(32, 3)
      expect(prices).toEqual([11, 11, 10])
      expect(prices.reduce((sum, price) => sum + price, 0)).toBe(32)
    })
  })

  describe("selectDjgaboTariff", () => {
    const payload = {
      ok: true,
      tarifas: [
        { cantidad: 1, precioTotal: 15, precioUnitario: 15 },
        { cantidad: 2, precioTotal: 25, precioUnitario: 12.5 },
        { cantidad: 3, precioTotal: 32 },
      ],
    }

    it("selects the live quantity tier", () => {
      expect(selectDjgaboTariff(payload, 3)).toMatchObject({
        cantidad: 3,
        precioTotal: 32,
      })
    })

    it("fails closed when a quantity is missing", () => {
      expect(() => selectDjgaboTariff(payload, 4)).toThrow(
        "No active DJGABO tariff for 4 paid tracks"
      )
    })

    it("rejects malformed totals", () => {
      expect(() =>
        selectDjgaboTariff(
          { tarifas: [{ cantidad: 2, precioTotal: "bad" }] },
          2
        )
      ).toThrow("Invalid DJGABO total")
    })
  })

  describe("fetchDjgaboPublicTariff", () => {
    const goodPayload = {
      ok: true,
      tarifas: [
        { cantidad: 1, precioTotal: 15 },
        { cantidad: 2, precioTotal: 25 },
        { cantidad: 3, precioTotal: 32 },
      ],
    }

    const okResponse = () =>
      ({
        ok: true,
        status: 200,
        json: async () => goodPayload,
      }) as Response

    it("retries one transient timeout and then returns the live tier", async () => {
      let calls = 0
      const fetchImpl = jest.fn(async () => {
        calls += 1
        if (calls === 1) {
          const error = new Error("aborted")
          error.name = "AbortError"
          throw error
        }
        return okResponse()
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicTariff(3, {
          fetchImpl,
          pricingApiUrl: "https://example.invalid/pricing",
          timeoutMs: 100,
          maxAttempts: 2,
        })
      ).resolves.toMatchObject({ cantidad: 3, precioTotal: 32 })

      expect(calls).toBe(2)
    })

    it("retries a transient 5xx response and then succeeds", async () => {
      let calls = 0
      const fetchImpl = jest.fn(async () => {
        calls += 1
        if (calls === 1) {
          return {
            ok: false,
            status: 503,
            json: async () => ({}),
          } as Response
        }
        return okResponse()
      }) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicTariff(2, {
          fetchImpl,
          pricingApiUrl: "https://example.invalid/pricing",
          timeoutMs: 100,
          maxAttempts: 2,
        })
      ).resolves.toMatchObject({ cantidad: 2, precioTotal: 25 })

      expect(calls).toBe(2)
    })

    it("rejects unsafe retry counts before making a request", async () => {
      const fetchImpl = jest.fn(async () => okResponse()) as unknown as typeof fetch

      await expect(
        fetchDjgaboPublicTariff(1, {
          fetchImpl,
          pricingApiUrl: "https://example.invalid/pricing",
          maxAttempts: 4,
        })
      ).rejects.toThrow("maxAttempts must be between 1 and 3")

      expect(fetchImpl).not.toHaveBeenCalled()
    })
  })
})