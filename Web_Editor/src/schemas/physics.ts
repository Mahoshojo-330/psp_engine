import type { ComponentSchema, EnumOption, FieldSchema } from '../core/types'

export interface Physics {
  vx: number
  vy: number
  gravity_magnitude: number
  gravity_direction: number
}

const GRAVITY_DIRECTIONS: readonly EnumOption[] = [
  { value: 0, label: 'Down' },
  { value: 1, label: 'Up' },
  { value: 2, label: 'Left' },
  { value: 3, label: 'Right' },
]

const fields: FieldSchema[] = [
  { name: 'vx',                label: 'VX',            kind: { kind: 'float' },                              default: 0   },
  { name: 'vy',                label: 'VY',            kind: { kind: 'float' },                              default: 0   },
  { name: 'gravity_magnitude', label: 'Gravity Mag.',  kind: { kind: 'float', min: 0 },                      default: 0.5 },
  { name: 'gravity_direction', label: 'Gravity Dir.',  kind: { kind: 'enum', options: GRAVITY_DIRECTIONS },  default: 0   },
]

export const physicsSchema: ComponentSchema<Physics> = {
  key: 'physics',
  label: 'Physics',
  maskBit: 4,
  sizeBytes: 16,
  requires: ['transform'],
  fields,
  validate: () => [],
  serialize: (data) => ({
    vx: data.vx,
    vy: data.vy,
    gravity_magnitude: data.gravity_magnitude,
    gravity_direction: data.gravity_direction,
  }),
  deserialize: (json) => {
    if (!isRecord(json)) throw new Error('physics: expected object')
    const { vx, vy, gravity_magnitude, gravity_direction } = json
    if (typeof vx !== 'number') throw new Error('physics.vx: expected number')
    if (typeof vy !== 'number') throw new Error('physics.vy: expected number')
    if (typeof gravity_magnitude !== 'number') throw new Error('physics.gravity_magnitude: expected number')
    if (typeof gravity_direction !== 'number') throw new Error('physics.gravity_direction: expected number')
    if (!GRAVITY_DIRECTIONS.some(o => o.value === gravity_direction)) {
      throw new Error(`physics.gravity_direction: out of range (got ${gravity_direction})`)
    }
    return { vx, vy, gravity_magnitude, gravity_direction }
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
