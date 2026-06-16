import { describe, it, expect } from 'vitest'
import { spriteSchema } from './sprite'

describe('spriteSchema', () => {
  it('matches Engine.md §5.2 metadata', () => {
    expect(spriteSchema.key).toBe('sprite')
    expect(spriteSchema.maskBit).toBe(2)
    expect(spriteSchema.sizeBytes).toBe(8)
    expect(spriteSchema.requires).toEqual(['transform'])
  })

  it('declares fields global_texture_id, colour_tint in that order', () => {
    expect(spriteSchema.fields.map(f => f.name)).toEqual(['global_texture_id', 'colour_tint'])
  })

  it('defaults to texture 0 and opaque-white tint (no tint)', () => {
    const byName = Object.fromEntries(spriteSchema.fields.map(f => [f.name, f.default]))
    expect(byName.global_texture_id).toBe(0)
    expect(byName.colour_tint).toBe(0xffffffff)
  })

  it('serialize emits the raw engine fields', () => {
    expect(spriteSchema.serialize({ global_texture_id: 2, colour_tint: 0xff00ff00 })).toEqual({
      global_texture_id: 2,
      colour_tint: 0xff00ff00,
    })
  })

  it('round-trips serialize → deserialize', () => {
    const cases = [
      { global_texture_id: 0, colour_tint: 0xffffffff },
      { global_texture_id: 5, colour_tint: 0x80123456 },
    ]
    for (const c of cases) {
      expect(spriteSchema.deserialize(spriteSchema.serialize(c))).toEqual(c)
    }
  })

  it('deserialize rejects non-objects and out-of-range values', () => {
    expect(() => spriteSchema.deserialize(null)).toThrow()
    expect(() => spriteSchema.deserialize({ global_texture_id: -1, colour_tint: 0 })).toThrow()
    expect(() => spriteSchema.deserialize({ global_texture_id: 1.5, colour_tint: 0 })).toThrow()
    expect(() => spriteSchema.deserialize({ global_texture_id: 0, colour_tint: 0x1_0000_0000 })).toThrow()
    expect(() => spriteSchema.deserialize({ global_texture_id: 0, colour_tint: -1 })).toThrow()
  })
})
