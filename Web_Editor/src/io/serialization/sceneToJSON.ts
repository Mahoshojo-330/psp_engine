import type { EntityId, Scene } from '../../core/types'
import { REGISTRY } from '../../schemas/registry'

export interface EntityJSON {
  id: EntityId
  components: Record<string, unknown>
}

export interface SceneJSON {
  entities: EntityJSON[]
}

export function sceneToJSON(scene: Scene): SceneJSON {
  return {
    entities: scene.entities.map(entity => {
      const components: Record<string, unknown> = {}
      for (const [key, data] of Object.entries(entity.components)) {
        const schema = REGISTRY[key]
        if (!schema) {
          throw new Error(`sceneToJSON: unknown component key '${key}' on entity ${entity.id}`)
        }
        components[key] = schema.serialize(data)
      }
      return { id: entity.id, components }
    }),
  }
}
