import type { ComponentSchema, FieldSchema } from '../core/types'

export interface Transform {
  x: number
  y: number
  width: number
  height: number
}

const fields: FieldSchema[] = [
  { name: 'x',      label: 'X',      kind: { kind: 'float' },          default: 0  },
  { name: 'y',      label: 'Y',      kind: { kind: 'float' },          default: 0  },
  { name: 'width',  label: 'Width',  kind: { kind: 'int', min: 0 },    default: 32 },
  { name: 'height', label: 'Height', kind: { kind: 'int', min: 0 },    default: 32 },
]

export const transformSchema: ComponentSchema<Transform> = {
  key: 'transform',
  label: 'Transform',
  maskBit: 1,
  sizeBytes: 16,
  fields,
  validate: () => [],
  serialize: (data) => ({
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
  }),
  deserialize: (json) => {
    if (!isRecord(json)) throw new Error('transform: expected object')
    const { x, y, width, height } = json
    if (typeof x !== 'number') throw new Error('transform.x: expected number')
    if (typeof y !== 'number') throw new Error('transform.y: expected number')
    if (typeof width !== 'number') throw new Error('transform.width: expected number')
    if (typeof height !== 'number') throw new Error('transform.height: expected number')
    return { x, y, width, height }
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
