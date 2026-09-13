import {
  allocateTierTotal,
  selectDjgaboTariff,
} from "../djgabo-pricing"

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
})
