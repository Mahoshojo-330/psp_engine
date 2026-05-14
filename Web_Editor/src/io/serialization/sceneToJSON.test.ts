import { describe, it, expect } from 'vitest'
import type { Scene } from '../../core/types'
import { sceneToJSON } from './sceneToJSON'

describe('sceneToJSON', () => {
  it('serializes an empty scene', () => {
    const scene: Scene = { entities: [], selectedEntityId: null }
    expect(sceneToJSON(scene)).toEqual({ entities: [] })
  })

  it('serializes a single transform-only entity to the Engine.md §6 shape', () => {
    const scene: Scene = {
      entities: [
        {
          id: 1,
          components: { transform: { x: 100, y: 50, width: 32, height: 32 } },
        },
      ],
      selectedEntityId: null,
    }
    expect(sceneToJSON(scene)).toEqual({
      entities: [
        {
          id: 1,
          components: {
            transform: { x: 100, y: 50, width: 32, height: 32 },
          },
        },
      ],
    })
  })

  it('preserves entity order', () => {
    const scene: Scene = {
      entities: [
        { id: 1, components: { transform: { x: 0, y: 0, width: 32, height: 32 } } },
        { id: 2, components: { transform: { x: 50, y: 50, width: 16, height: 16 } } },
        { id: 3, components: { transform: { x: 100, y: 0, width: 8, height: 8 } } },
      ],
      selectedEntityId: null,
    }
    expect(sceneToJSON(scene).entities.map(e => e.id)).toEqual([1, 2, 3])
  })

  it('omits display_name and player_controlled (deferred features)', () => {
    const scene: Scene = {
      entities: [
        { id: 1, components: { transform: { x: 0, y: 0, width: 32, height: 32 } } },
      ],
      selectedEntityId: null,
    }
    const json = sceneToJSON(scene)
    expect(json.entities[0]).not.toHaveProperty('display_name')
    expect(json.entities[0]).not.toHaveProperty('player_controlled')
  })

  it('lifts isFlag schemas (player_controlled) to a top-level entity boolean', () => {
    const scene: Scene = {
      entities: [
        {
          id: 1,
          components: {
            transform: { x: 100, y: 50, width: 32, height: 32 },
            physics: { vx: 0, vy: 0, gravity_magnitude: 0.5, gravity_direction: 0 },
            player_controlled: {},
          },
        },
      ],
      selectedEntityId: null,
    }
    const json = sceneToJSON(scene)
    const entity = json.entities[0]!
    expect(entity.player_controlled).toBe(true)
    expect(entity.components).not.toHaveProperty('player_controlled')
    expect(Object.keys(entity.components).sort()).toEqual(['physics', 'transform'])
  })

  it('throws on unknown component key', () => {
    const scene: Scene = {
      entities: [{ id: 1, components: { mystery: {} } }],
      selectedEntityId: null,
    }
    expect(() => sceneToJSON(scene)).toThrow(/unknown component key 'mystery'/)
  })
})
