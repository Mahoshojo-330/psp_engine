import { describe, expect, it } from 'vitest'
import { MAX_TEXTURE_SIZE, snapToPowerOfTwo } from './snap'

describe('snapToPowerOfTwo', () => {
  it('returns exact powers of two unchanged', () => {
    for (const p of [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]) {
      expect(snapToPowerOfTwo(p)).toBe(p)
    }
  })

  it('snaps to the nearest power of two', () => {
    expect(snapToPowerOfTwo(30)).toBe(32)
    expect(snapToPowerOfTwo(33)).toBe(32)
    expect(snapToPowerOfTwo(200)).toBe(256)
    expect(snapToPowerOfTwo(100)).toBe(128) // 100 closer to 128 than 64
  })

  it('rounds exact ties up to the larger power', () => {
    expect(snapToPowerOfTwo(3)).toBe(4) // between 2 and 4
    expect(snapToPowerOfTwo(48)).toBe(64) // between 32 and 64
  })

  it('clamps to the [1, max] range', () => {
    expect(snapToPowerOfTwo(0)).toBe(1)
    expect(snapToPowerOfTwo(-50)).toBe(1)
    expect(snapToPowerOfTwo(0.5)).toBe(1)
    expect(snapToPowerOfTwo(99999)).toBe(MAX_TEXTURE_SIZE)
  })

  it('honors a custom max ceiling', () => {
    expect(snapToPowerOfTwo(300, 256)).toBe(256)
    expect(snapToPowerOfTwo(9999, 64)).toBe(64)
  })

  it('treats non-finite input as the minimum (degenerate input, never a real size)', () => {
    expect(snapToPowerOfTwo(Number.NaN)).toBe(1)
    expect(snapToPowerOfTwo(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
