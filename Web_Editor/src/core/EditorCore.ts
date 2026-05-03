import type { ComponentSchema, Entity, EntityId, Scene } from './types'
import { REGISTRY } from '../schemas/registry'

const EMPTY_SCENE: Scene = { entities: [], selectedEntityId: null }

export class EditorCore {
  private scene: Scene = EMPTY_SCENE
  private listeners = new Set<() => void>()
  private nextId: EntityId = 1

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): Scene => this.scene

  addEntity = (componentKeys: readonly string[]): EntityId => {
    const id = this.nextId++
    const components: Record<string, unknown> = {}
    for (const key of componentKeys) {
      const schema = REGISTRY[key]
      if (!schema) throw new Error(`Unknown component key: ${key}`)
      components[key] = makeDefault(schema)
    }
    const entity: Entity = { id, components }
    this.scene = {
      entities: [...this.scene.entities, entity],
      selectedEntityId: this.scene.selectedEntityId,
    }
    this.emit()
    return id
  }

  selectEntity = (id: EntityId | null): void => {
    if (this.scene.selectedEntityId === id) return
    this.scene = { entities: this.scene.entities, selectedEntityId: id }
    this.emit()
  }

  setField = (
    id: EntityId,
    componentKey: string,
    fieldName: string,
    value: unknown,
  ): void => {
    const entities = this.scene.entities
    const idx = entities.findIndex(e => e.id === id)
    const old = entities[idx]
    if (!old) throw new Error(`Entity not found: ${id}`)
    const oldComponent = old.components[componentKey]
    if (!isRecord(oldComponent)) {
      throw new Error(`Entity ${id} has no '${componentKey}' component`)
    }
    const next: Entity = {
      id: old.id,
      components: {
        ...old.components,
        [componentKey]: { ...oldComponent, [fieldName]: value },
      },
    }
    const nextEntities = entities.slice()
    nextEntities[idx] = next
    this.scene = {
      entities: nextEntities,
      selectedEntityId: this.scene.selectedEntityId,
    }
    this.emit()
  }

  private emit = (): void => {
    for (const listener of this.listeners) listener()
  }
}

function makeDefault(schema: ComponentSchema<unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of schema.fields) out[field.name] = field.default
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
