// Drift test: pins the schema layer against Engine.md §5. Hand-typed table.
//
// This test is a wall: changing any of these values without updating Engine.md
// (and the C engine alongside) is a layout drift and fails here loudly.
//
// Field names below are the *editor's* names, not the binary names. The collider
// uses `is_solid` (bool); on the JSON wire it serializes to `flags: 0|1`. The
// JSON-wire shape is pinned by the round-trip test in collider.test.ts. Together
// the two tests pin both ends of the schema → JSON pipeline.

import { describe, it, expect } from 'vitest'
import { REGISTRY } from './registry'

interface ExpectedRow {
  key: string
  maskBit: number
  sizeBytes: number
  fields: readonly string[]
  isFlag?: boolean
}

const expected: readonly ExpectedRow[] = [
  { key: 'transform',         maskBit: 1, sizeBytes: 16, fields: ['x', 'y', 'width', 'height'] },
  { key: 'collider',          maskBit: 3, sizeBytes: 20, fields: ['offset_x', 'offset_y', 'width', 'height', 'is_solid'] },
  { key: 'physics',           maskBit: 4, sizeBytes: 16, fields: ['vx', 'vy', 'gravity_magnitude', 'gravity_direction'] },
  { key: 'player_controlled', maskBit: 5, sizeBytes: 0,  fields: [], isFlag: true },
]

describe('registry drift vs Engine.md §5', () => {
  for (const row of expected) {
    it(`schema '${row.key}' matches the canonical layout`, () => {
      const schema = REGISTRY[row.key]
      if (!schema) throw new Error(`schema '${row.key}' is not registered`)
      expect(schema.maskBit, `${row.key}.maskBit`).toBe(row.maskBit)
      expect(schema.sizeBytes, `${row.key}.sizeBytes`).toBe(row.sizeBytes)
      expect(schema.fields.map(f => f.name), `${row.key}.fields ordering`).toEqual(row.fields)
      expect(schema.isFlag ?? false, `${row.key}.isFlag`).toBe(row.isFlag ?? false)
    })
  }

  it('every registered schema is in the expected table (no orphans)', () => {
    const expectedKeys = new Set(expected.map(r => r.key))
    for (const key of Object.keys(REGISTRY)) {
      expect(expectedKeys.has(key), `registered key '${key}' missing from drift table`).toBe(true)
    }
  })
})
