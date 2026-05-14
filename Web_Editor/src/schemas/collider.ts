import type { ComponentSchema, FieldSchema } from '../core/types'

export interface Collider {
  offset_x: number
  offset_y: number
  width: number
  height: number
  is_solid: boolean
}

const fields: FieldSchema[] = [
  { name: 'offset_x', label: 'Offset X', kind: { kind: 'float' },       default: 0     },
  { name: 'offset_y', label: 'Offset Y', kind: { kind: 'float' },       default: 0     },
  { name: 'width',    label: 'Width',    kind: { kind: 'float', min: 0 }, default: 32  },
  { name: 'height',   label: 'Height',   kind: { kind: 'float', min: 0 }, default: 32  },
  { name: 'is_solid', label: 'Solid',    kind: { kind: 'bool' },         default: true  },
]

export const colliderSchema: ComponentSchema<Collider> = {
  key: 'collider',
  label: 'Collider',
  maskBit: 3,
  sizeBytes: 20,
  requires: ['transform'],
  fields,
  validate: () => [],
  serialize: (data) => ({
    offset_x: data.offset_x,
    offset_y: data.offset_y,
    width: data.width,
    height: data.height,
    flags: data.is_solid ? 1 : 0,
  }),
  deserialize: (json) => {
    if (!isRecord(json)) throw new Error('collider: expected object')
    const { offset_x, offset_y, width, height, flags } = json
    if (typeof offset_x !== 'number') throw new Error('collider.offset_x: expected number')
    if (typeof offset_y !== 'number') throw new Error('collider.offset_y: expected number')
    if (typeof width !== 'number') throw new Error('collider.width: expected number')
    if (typeof height !== 'number') throw new Error('collider.height: expected number')
    if (typeof flags !== 'number') throw new Error('collider.flags: expected number')
    return {
      offset_x,
      offset_y,
      width,
      height,
      is_solid: (flags & 1) === 1,
    }
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
