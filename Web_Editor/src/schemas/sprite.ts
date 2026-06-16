import type { ComponentSchema, FieldSchema } from '../core/types'

// Engine.md §5.2: WHAT to render. Requires `transform` to actually appear.
//   global_texture_id → index into the texture table (tex_{id}.raw on disk).
//   colour_tint       → ABGR uint32, multiplied with the texture. 0xFFFFFFFF = none.
// A missing/unloaded texture id makes the engine draw a solid `colour_tint` rect —
// the editor mirrors that fallback on the canvas.

export interface Sprite {
  global_texture_id: number
  colour_tint: number
}

const DEFAULT_TINT = 0xffffffff // 4294967295 — opaque white, "no tint"

const fields: FieldSchema[] = [
  { name: 'global_texture_id', label: 'Texture', kind: { kind: 'int', min: 0 },             default: 0           },
  { name: 'colour_tint',       label: 'Tint',    kind: { kind: 'int', min: 0, max: DEFAULT_TINT }, default: DEFAULT_TINT },
]

export const spriteSchema: ComponentSchema<Sprite> = {
  key: 'sprite',
  label: 'Sprite',
  maskBit: 2,
  sizeBytes: 8,
  requires: ['transform'],
  fields,
  validate: () => [],
  serialize: (data) => ({
    global_texture_id: data.global_texture_id,
    colour_tint: data.colour_tint,
  }),
  deserialize: (json) => {
    if (!isRecord(json)) throw new Error('sprite: expected object')
    const { global_texture_id, colour_tint } = json
    if (typeof global_texture_id !== 'number') {
      throw new Error('sprite.global_texture_id: expected number')
    }
    if (!Number.isInteger(global_texture_id) || global_texture_id < 0) {
      throw new Error('sprite.global_texture_id: expected a non-negative integer')
    }
    if (typeof colour_tint !== 'number') {
      throw new Error('sprite.colour_tint: expected number')
    }
    if (!Number.isInteger(colour_tint) || colour_tint < 0 || colour_tint > 0xffffffff) {
      throw new Error('sprite.colour_tint: expected a uint32 (0..4294967295)')
    }
    return { global_texture_id, colour_tint }
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
