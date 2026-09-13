import {
  djgaboCatalogIdentityKey,
  djgaboSkuFromCatalogIdentity,
  normalizeDjgaboDriveId,
} from "../djgabo-catalog"
import {
  buildDjgaboStoreCatalogIndex,
  clearDjgaboStoreCatalogCacheForTests,
  extractDjgaboDriveId,
  loadDjgaboStoreCatalogIndex,
  resolveDjgaboStoreCatalogTrack,
} from "../djgabo-store-catalog"

describe("DJGABO catalog v2 identity", () => {
  it("uses songKey + Drive ID so duplicate song keys can coexist", () => {
    const songKey = "agua marina puras mentiras"
    const first = djgaboSkuFromCatalogIdentity(
      songKey,
      "1hZcyLOoDmovLsA17qa3GqOznv3SlWyhe"
    )
    const second = djgaboSkuFromCatalogIdentity(
      songKey,
      "1SKpwj68cnjCe6VVPlbErj4fPJ5paCFgC"
    )

    expect(first).toMatch(/^DJGABO2-[A-F0-9]{20}$/)
    expect(second).toMatch(/^DJGABO2-[A-F0-9]{20}$/)
    expect(first).not.toBe(second)
  })

  it("maps the audited current-catalog candidate deterministically", () => {
    expect(
      djgaboSkuFromCatalogIdentity(
        "karibe band ft victor romero mix venite volando coro",
        "1AOrxHmRWdJcU2v7It_0pkZnLJjBzAHZk"
      )
    ).toBe("DJGABO2-C9932404CA71F8A20396")
  })

  it("normalizes and validates Drive IDs", () => {
    expect(normalizeDjgaboDriveId(" 1AOrxHmRWdJcU2v7It_0pkZnLJjBzAHZk ")).toBe(
      "1AOrxHmRWdJcU2v7It_0pkZnLJjBzAHZk"
    )
    expect(() => normalizeDjgaboDriveId("bad id")).toThrow(
      "DJGABO Drive ID is invalid"
    )
  })

  it("keeps the Drive ID inside the identity key", () => {
    expect(
      djgaboCatalogIdentityKey("Amé   Una", "1AOrxHmRWdJcU2v7It_0pkZnLJjBzAHZk")
    ).toBe("ame una\n1AOrxHmRWdJcU2v7It_0pkZnLJjBzAHZk")
  })
})

describe("DJGABO trusted store catalog", () => {
  const firstDrive = "1hZcyLOoDmovLsA17qa3GqOznv3SlWyhe"
  const secondDrive = "1SKpwj68cnjCe6VVPlbErj4fPJ5paCFgC"

  beforeEach(() => clearDjgaboStoreCatalogCacheForTests())

  it("extracts Drive IDs from supported Google Drive URLs", () => {
    expect(
      extractDjgaboDriveId(
        `https://drive.google.com/uc?export=download&id=${firstDrive}`
      )
    ).toBe(firstDrive)
    expect(
      extractDjgaboDriveId(`https://drive.google.com/file/d/${secondDrive}/view`)
    ).toBe(secondDrive)
  })

  it("indexes the same songKey with two different Drive IDs separately", () => {
    const index = buildDjgaboStoreCatalogIndex([
      {
        songKey: "agua marina puras mentiras",
        artist: "Agua Marina",
        title: "Puras Mentiras",
        audio: `https://drive.google.com/uc?export=download&id=${firstDrive}`,
      },
      {
        songKey: "agua marina puras mentiras",
        artist: "Agua Marina",
        title: "Puras Mentiras",
        audio: `https://drive.google.com/uc?export=download&id=${secondDrive}`,
      },
    ])

    expect(index.byIdentity.size).toBe(2)
    expect(
      resolveDjgaboStoreCatalogTrack(
        index,
        "agua marina puras mentiras",
        firstDrive
      ).driveId
    ).toBe(firstDrive)
    expect(
      resolveDjgaboStoreCatalogTrack(
        index,
        "agua marina puras mentiras",
        secondDrive
      ).driveId
    ).toBe(secondDrive)
  })

  it("skips rows without a trusted Drive ID", () => {
    const index = buildDjgaboStoreCatalogIndex([
      {
        songKey: "with drive",
        artist: "Artist",
        title: "Title",
        audio: `https://drive.google.com/uc?export=download&id=${firstDrive}`,
      },
      {
        songKey: "without drive",
        artist: "Artist",
        title: "No Audio",
        audio: "",
      },
    ])

    expect(index.skippedWithoutDrive).toBe(1)
    expect(() =>
      resolveDjgaboStoreCatalogTrack(index, "without drive", firstDrive)
    ).toThrow("not present in the trusted catalog")
  })

  it("fails closed when the exact composite identity has conflicting metadata", () => {
    const index = buildDjgaboStoreCatalogIndex([
      {
        songKey: "same key",
        artist: "Artist A",
        title: "Title",
        audio: `https://drive.google.com/uc?export=download&id=${firstDrive}`,
      },
      {
        songKey: "same key",
        artist: "Artist B",
        title: "Different",
        audio: `https://drive.google.com/uc?export=download&id=${firstDrive}`,
      },
      {
        songKey: "safe key",
        artist: "Safe",
        title: "Safe",
        audio: `https://drive.google.com/uc?export=download&id=${secondDrive}`,
      },
    ])

    expect(index.ambiguousIdentities.size).toBe(1)
    expect(() =>
      resolveDjgaboStoreCatalogTrack(index, "same key", firstDrive)
    ).toThrow("identity is ambiguous")
  })

  it("caches one trusted catalog fetch within the TTL", async () => {
    let calls = 0
    const payload = [
      {
        songKey: "safe key",
        artist: "Safe",
        title: "Safe",
        audio: `https://drive.google.com/uc?export=download&id=${firstDrive}`,
      },
    ]
    const fetchCatalogImpl = async () => {
      calls += 1
      return payload
    }

    const first = await loadDjgaboStoreCatalogIndex({
      catalogUrl: "https://example.com/catalog.json",
      fetchCatalogImpl,
      cacheTtlMs: 60_000,
      now: () => 1000,
    })
    const second = await loadDjgaboStoreCatalogIndex({
      catalogUrl: "https://example.com/catalog.json",
      fetchCatalogImpl,
      cacheTtlMs: 60_000,
      now: () => 2000,
    })

    expect(calls).toBe(1)
    expect(second).toBe(first)
  })
})
