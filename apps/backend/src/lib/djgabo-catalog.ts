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

export function djgaboSkuFromSongKey(songKey: string): string {
  const normalized = normalizeDjgaboSongKey(songKey)
  const hash = createHash("sha256").update(normalized, "utf8").digest("hex")
  return `DJGABO-${hash.slice(0, 20).toUpperCase()}`
}
