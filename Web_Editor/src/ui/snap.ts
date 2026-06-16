// Power-of-two sizing. The PSP rasterizes textures whose dimensions are powers
// of two; the converter pads any source PNG up to the next power of two (≤ 512,
// Engine.md §2/§7). The editor hard-snaps entity render sizes to those same
// steps so "what you size is what the texture will be," with no surprise stretch.

export const MAX_TEXTURE_SIZE = 512

/** The discrete sizes an entity width/height may take, up to the PSP ceiling. */
export const POWER_OF_TWO_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512] as const

/**
 * Snap a size to the nearest power of two in [1, MAX_TEXTURE_SIZE]. Ties (a value
 * exactly between two powers, e.g. 3 or 96) round up to the larger size, which
 * keeps a deliberate drag from collapsing to something smaller than intended.
 */
export function snapToPowerOfTwo(n: number, max: number = MAX_TEXTURE_SIZE): number {
  if (!Number.isFinite(n) || n <= 1) return 1
  const capped = Math.min(n, max)
  const lower = 2 ** Math.floor(Math.log2(capped))
  const upper = Math.min(lower * 2, max)
  // Strict `<` sends exact ties to `upper` (round up).
  const pick = capped - lower < upper - capped ? lower : upper
  return Math.min(pick, max)
}
