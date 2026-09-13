import { createHash } from "crypto"

export function normalizeDjgaboSongKey(songKey: string): string {
  const normalized = String(songKey || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

  if (!normalized) {
    throw new Error("DJGABO song key is required")
  }

  return normalized
}

export function normalizeDjgaboDriveId(driveId: string): string {
  const normalized = String(driveId || "").trim()
  if (!/^[A-Za-z0-9_-]{10,}$/.test(normalized)) {
    throw new Error("DJGABO Drive ID is invalid")
  }
  return normalized
}

export function djgaboSkuFromSongKey(songKey: string): string {
  const normalized = normalizeDjgaboSongKey(songKey)
  const hash = createHash("sha256").update(normalized, "utf8").digest("hex")
  return `DJGABO-${hash.slice(0, 20).toUpperCase()}`
}

export function djgaboCatalogIdentityKey(
  songKey: string,
  driveId: string
): string {
  return `${normalizeDjgaboSongKey(songKey)}\n${normalizeDjgaboDriveId(driveId)}`
}

export function djgaboSkuFromCatalogIdentity(
  songKey: string,
  driveId: string
): string {
  const identity = djgaboCatalogIdentityKey(songKey, driveId)
  const hash = createHash("sha256").update(identity, "utf8").digest("hex")
  return `DJGABO2-${hash.slice(0, 20).toUpperCase()}`
}
