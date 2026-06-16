import { describe, expect, it } from 'vitest'
import { abgrAlpha, abgrToRgbHex, rgbHexAndAlphaToAbgr, TINT_WHITE } from './colour'

describe('colour ABGR <-> RGB-hex/alpha', () => {
  it('decodes opaque white (the no-tint default)', () => {
    expect(abgrToRgbHex(TINT_WHITE)).toBe('#ffffff')
    expect(abgrAlpha(TINT_WHITE)).toBe(255)
  })

  it('decodes channels in PSP ABGR order', () => {
    // A=0x80, B=0x33, G=0x66, R=0x99
    const abgr = 0x80336699
    expect(abgrToRgbHex(abgr)).toBe('#996633')
    expect(abgrAlpha(abgr)).toBe(0x80)
  })

  it('encodes hex + alpha back to ABGR', () => {
    expect(rgbHexAndAlphaToAbgr('#996633', 0x80)).toBe(0x80336699)
    expect(rgbHexAndAlphaToAbgr('#ffffff', 255)).toBe(TINT_WHITE)
  })

  it('round-trips an arbitrary colour', () => {
    const original = 0xc0a1b2c3
    const hex = abgrToRgbHex(original)
    const alpha = abgrAlpha(original)
    expect(rgbHexAndAlphaToAbgr(hex, alpha)).toBe(original)
  })

  it('produces an unsigned 32-bit result even for full alpha', () => {
    const v = rgbHexAndAlphaToAbgr('#000000', 255)
    expect(v).toBe(0xff000000)
    expect(v).toBeGreaterThan(0)
  })

  it('falls back to white on malformed hex and clamps alpha', () => {
    expect(rgbHexAndAlphaToAbgr('nonsense', 999)).toBe(TINT_WHITE)
    expect(rgbHexAndAlphaToAbgr('#fff', -10)).toBe(0x00ffffff)
  })
})
