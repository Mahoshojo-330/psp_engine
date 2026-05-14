import type { EntityId, Scene } from '../../core/types'
import { REGISTRY } from '../../schemas/registry'

export interface EntityJSON {
  id: EntityId
  components: Record<string, unknown>
  [flag: string]: unknown
}

export interface SceneJSON {
  entities: EntityJSON[]
}

export function sceneToJSON(scene: Scene): SceneJSON {
  return {
    entities: scene.entities.map(entity => {
      const components: Record<string, unknown> = {}
      const flags: Record<string, true> = {}
      for (const [key, data] of Object.entries(entity.components)) {
        const schema = REGISTRY[key]
        if (!schema) {
          throw new Error(`sceneToJSON: unknown component key '${key}' on entity ${entity.id}`)
        }
        if (schema.isFlag) flags[key] = true
        else components[key] = schema.serialize(data)
      }
      return { id: entity.id, ...flags, components }
    }),
  }
}
