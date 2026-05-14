import { describe, it, expect } from 'vitest'
import { playerControlledSchema } from './player_controlled'

describe('playerControlledSchema', () => {
  it('matches Engine.md §5.5 metadata (flag-only, mask bit 5)', () => {
    expect(playerControlledSchema.key).toBe('player_controlled')
    expect(playerControlledSchema.maskBit).toBe(5)
    expect(playerControlledSchema.sizeBytes).toBe(0)
    expect(playerControlledSchema.isFlag).toBe(true)
  })

  it('declares no fields', () => {
    expect(playerControlledSchema.fields).toEqual([])
  })

  it('requires transform and physics', () => {
    expect(playerControlledSchema.requires).toEqual(['transform', 'physics'])
  })

  it('serialize returns an empty record; round-trips', () => {
    expect(playerControlledSchema.serialize({})).toEqual({})
    expect(playerControlledSchema.deserialize({})).toEqual({})
  })

  it('deserialize rejects non-object inputs', () => {
    expect(() => playerControlledSchema.deserialize(null)).toThrow()
    expect(() => playerControlledSchema.deserialize('nope')).toThrow()
  })
})
