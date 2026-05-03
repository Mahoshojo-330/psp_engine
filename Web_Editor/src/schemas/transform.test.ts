import { describe, it, expect } from 'vitest'
import { transformSchema } from './transform'

describe('transformSchema', () => {
  it('matches Engine.md §5.1 metadata', () => {
    expect(transformSchema.key).toBe('transform')
    expect(transformSchema.maskBit).toBe(1)
    expect(transformSchema.sizeBytes).toBe(16)
  })

  it('declares fields x, y, width, height in that order', () => {
    expect(transformSchema.fields.map(f => f.name)).toEqual([
      'x',
      'y',
      'width',
      'height',
    ])
  })

  it('uses float kind for x/y and int kind for width/height', () => {
    const byName = Object.fromEntries(
      transformSchema.fields.map(f => [f.name, f.kind.kind]),
    )
    expect(byName.x).toBe('float')
    expect(byName.y).toBe('float')
    expect(byName.width).toBe('int')
    expect(byName.height).toBe('int')
  })

  it('exposes defaults that match Engine.md §14 for placement', () => {
    const byName = Object.fromEntries(
      transformSchema.fields.map(f => [f.name, f.default]),
    )
    expect(byName.x).toBe(0)
    expect(byName.y).toBe(0)
    expect(byName.width).toBe(32)
    expect(byName.height).toBe(32)
  })

  it('validate returns no issues in V1.1', () => {
    expect(transformSchema.validate({ x: 0, y: 0, width: 32, height: 32 })).toEqual([])
  })

  it('serialize returns the Engine.md §6 shape', () => {
    expect(transformSchema.serialize({ x: 100, y: 50, width: 32, height: 32 })).toEqual({
      x: 100, y: 50, width: 32, height: 32,
    })
  })

  it('round-trips serialize → deserialize', () => {
    const cases = [
      { x: 0, y: 0, width: 32, height: 32 },
      { x: 100.5, y: -25.25, width: 480, height: 272 },
      { x: -0.0001, y: 999.999, width: 1, height: 1 },
    ]
    for (const t of cases) {
      expect(transformSchema.deserialize(transformSchema.serialize(t))).toEqual(t)
    }
  })

  it('deserialize rejects non-object input', () => {
    expect(() => transformSchema.deserialize(null)).toThrow()
    expect(() => transformSchema.deserialize(42)).toThrow()
    expect(() => transformSchema.deserialize('nope')).toThrow()
  })

  it('deserialize rejects missing or wrong-typed fields', () => {
    expect(() => transformSchema.deserialize({ x: 0, y: 0, width: 32 })).toThrow()
    expect(() => transformSchema.deserialize({ x: '0', y: 0, width: 32, height: 32 })).toThrow()
  })
})
