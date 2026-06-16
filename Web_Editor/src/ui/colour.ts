// `sprite.colour_tint` is a 32-bit unsigned int in PSP ABGR order (Engine.md §6):
//   bits 0-7 = R, 8-15 = G, 16-23 = B, 24-31 = A.
// The browser's native colour input speaks "#rrggbb", and alpha is a separate
// 0-255 channel, so these helpers bridge the two representations. Storage stays
// the engine's ABGR uint32 everywhere; conversion happens only at the input edge.

export const TINT_WHITE = 0xffffffff // 4294967295 — "no tint" (opaque white)

export function abgrToRgbHex(abgr: number): string {
  const r = abgr & 0xff
  const g = (abgr >>> 8) & 0xff
  const b = (abgr >>> 16) & 0xff
  return '#' + [r, g, b].map(toHexByte).join('')
}

export function abgrAlpha(abgr: number): number {
  return (abgr >>> 24) & 0xff
}

export function rgbHexAndAlphaToAbgr(hex: string, alpha: number): number {
  const { r, g, b } = parseRgbHex(hex)
  const a = clampByte(alpha)
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

function parseRgbHex(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 255, g: 255, b: 255 }
  const n = Number.parseInt(m[1]!, 16)
  return { r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff }
}

function toHexByte(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0')
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}
