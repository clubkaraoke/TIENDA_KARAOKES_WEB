import {
  djgaboSkuFromSongKey,
  normalizeDjgaboSongKey,
} from "../djgabo-catalog"

describe("DJGABO catalog identity", () => {
  it("normalizes accents, case, and repeated spaces", () => {
    expect(normalizeDjgaboSongKey("  Dulce  Beatriz Mix Huaycheños ")).toBe(
      "dulce beatriz mix huaychenos"
    )
  })

  it("builds the same SKU for equivalent song keys", () => {
    expect(djgaboSkuFromSongKey("Mix Huaycheños")).toBe(
      djgaboSkuFromSongKey(" mix   huaychenos ")
    )
  })

  it("builds different SKUs for different songs", () => {
    expect(djgaboSkuFromSongKey("song one")).not.toBe(
      djgaboSkuFromSongKey("song two")
    )
  })
})
