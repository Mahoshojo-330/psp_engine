import type { ComponentSchema, FieldSchema } from '../core/types'

export type PlayerControlled = Record<string, never>

const fields: FieldSchema[] = []

export const playerControlledSchema: ComponentSchema<PlayerControlled> = {
  key: 'player_controlled',
  label: 'Player Controlled',
  maskBit: 5,
  sizeBytes: 0,
  requires: ['transform', 'physics'],
  isFlag: true,
  fields,
  validate: () => [],
  serialize: () => ({}),
  deserialize: (json) => {
    if (!isRecord(json)) throw new Error('player_controlled: expected object')
    return {}
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
