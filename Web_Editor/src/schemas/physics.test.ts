import { describe, it, expect } from 'vitest'
import { physicsSchema } from './physics'

describe('physicsSchema', () => {
  it('matches Engine.md §5.4 metadata', () => {
    expect(physicsSchema.key).toBe('physics')
    expect(physicsSchema.maskBit).toBe(4)
    expect(physicsSchema.sizeBytes).toBe(16)
    expect(physicsSchema.requires).toEqual(['transform'])
  })

  it('declares fields vx, vy, gravity_magnitude, gravity_direction in order', () => {
    expect(physicsSchema.fields.map(f => f.name)).toEqual([
      'vx',
      'vy',
      'gravity_magnitude',
      'gravity_direction',
    ])
  })

  it('uses enum kind for gravity_direction with four cardinal options', () => {
    const grav = physicsSchema.fields.find(f => f.name === 'gravity_direction')!
    expect(grav.kind.kind).toBe('enum')
    if (grav.kind.kind === 'enum') {
      expect(grav.kind.options.map(o => o.value)).toEqual([0, 1, 2, 3])
      expect(grav.kind.options.map(o => o.label)).toEqual(['Down', 'Up', 'Left', 'Right'])
    }
  })

  it('defaults gravity_magnitude to 0.5 and gravity_direction to 0 (down)', () => {
    const byName = Object.fromEntries(physicsSchema.fields.map(f => [f.name, f.default]))
    expect(byName.gravity_magnitude).toBe(0.5)
    expect(byName.gravity_direction).toBe(0)
  })

  it('round-trips serialize → deserialize across all gravity directions', () => {
    for (const dir of [0, 1, 2, 3]) {
      const data = { vx: 1.5, vy: -2.25, gravity_magnitude: 0.5, gravity_direction: dir }
      expect(physicsSchema.deserialize(physicsSchema.serialize(data))).toEqual(data)
    }
  })

  it('deserialize rejects gravity_direction out of range', () => {
    expect(() => physicsSchema.deserialize({ vx: 0, vy: 0, gravity_magnitude: 0, gravity_direction: 4 })).toThrow()
    expect(() => physicsSchema.deserialize({ vx: 0, vy: 0, gravity_magnitude: 0, gravity_direction: -1 })).toThrow()
  })

  it('deserialize rejects non-objects and wrong-typed fields', () => {
    expect(() => physicsSchema.deserialize(null)).toThrow()
    expect(() => physicsSchema.deserialize({ vx: '0', vy: 0, gravity_magnitude: 0, gravity_direction: 0 })).toThrow()
    expect(() => physicsSchema.deserialize({ vx: 0, vy: 0, gravity_magnitude: 0 })).toThrow()
  })
})
