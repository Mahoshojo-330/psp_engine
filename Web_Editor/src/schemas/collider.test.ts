import { describe, it, expect } from 'vitest'
import { colliderSchema } from './collider'

describe('colliderSchema', () => {
  it('matches Engine.md §5.3 metadata', () => {
    expect(colliderSchema.key).toBe('collider')
    expect(colliderSchema.maskBit).toBe(3)
    expect(colliderSchema.sizeBytes).toBe(20)
    expect(colliderSchema.requires).toEqual(['transform'])
  })

  it('declares fields offset_x, offset_y, width, height, is_solid in that order', () => {
    expect(colliderSchema.fields.map(f => f.name)).toEqual([
      'offset_x',
      'offset_y',
      'width',
      'height',
      'is_solid',
    ])
  })

  it('uses bool kind for is_solid; floats for the rest', () => {
    const byName = Object.fromEntries(colliderSchema.fields.map(f => [f.name, f.kind.kind]))
    expect(byName.offset_x).toBe('float')
    expect(byName.offset_y).toBe('float')
    expect(byName.width).toBe('float')
    expect(byName.height).toBe('float')
    expect(byName.is_solid).toBe('bool')
  })

  it('defaults is_solid to true (Engine.md §10 recommendation)', () => {
    const byName = Object.fromEntries(colliderSchema.fields.map(f => [f.name, f.default]))
    expect(byName.is_solid).toBe(true)
  })

  it('serialize emits flags: 1 when is_solid, flags: 0 otherwise', () => {
    expect(colliderSchema.serialize({ offset_x: 0, offset_y: 0, width: 32, height: 32, is_solid: true })).toEqual({
      offset_x: 0, offset_y: 0, width: 32, height: 32, flags: 1,
    })
    expect(colliderSchema.serialize({ offset_x: 1, offset_y: 2, width: 10, height: 20, is_solid: false })).toEqual({
      offset_x: 1, offset_y: 2, width: 10, height: 20, flags: 0,
    })
  })

  it('round-trips serialize → deserialize', () => {
    const cases = [
      { offset_x: 0, offset_y: 0, width: 32, height: 32, is_solid: true },
      { offset_x: 4, offset_y: -8, width: 16, height: 16, is_solid: false },
    ]
    for (const c of cases) {
      expect(colliderSchema.deserialize(colliderSchema.serialize(c))).toEqual(c)
    }
  })

  it('deserialize ignores reserved bits in flags (only bit 0 = is_solid)', () => {
    const r = colliderSchema.deserialize({ offset_x: 0, offset_y: 0, width: 1, height: 1, flags: 0xFF })
    expect(r.is_solid).toBe(true)
    const r2 = colliderSchema.deserialize({ offset_x: 0, offset_y: 0, width: 1, height: 1, flags: 0xFE })
    expect(r2.is_solid).toBe(false)
  })

  it('deserialize rejects non-objects and missing or wrong-typed fields', () => {
    expect(() => colliderSchema.deserialize(null)).toThrow()
    expect(() => colliderSchema.deserialize({ offset_x: 0, offset_y: 0, width: 1, height: 1 })).toThrow()
    expect(() => colliderSchema.deserialize({ offset_x: '0', offset_y: 0, width: 1, height: 1, flags: 0 })).toThrow()
  })
})
