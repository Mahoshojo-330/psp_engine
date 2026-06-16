import type { ComponentSchema, EditorSnapshot, Entity, EntityId, Scene } from './types'
import { REGISTRY } from '../schemas/registry'

const HISTORY_CAP = 100

export class EditorCore {
  private scene: Scene = { entities: [], selectedEntityId: null }
  private listeners = new Set<() => void>()
  private nextId: EntityId = 1
  private history: Scene[] = []
  private redoStack: Scene[] = []
  private txOpen = false
  private txStartScene: Scene | null = null
  private cachedSnapshot: EditorSnapshot | null = null

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): EditorSnapshot => {
    if (this.cachedSnapshot === null) {
      this.cachedSnapshot = {
        entities: this.scene.entities,
        selectedEntityId: this.scene.selectedEntityId,
        canUndo: this.history.length > 0,
        canRedo: this.redoStack.length > 0,
      }
    }
    return this.cachedSnapshot
  }

  addEntity = (componentKeys: readonly string[]): EntityId => {
    const id = this.nextId++
    const components: Record<string, unknown> = {}
    for (const key of componentKeys) {
      const schema = REGISTRY[key]
      if (!schema) throw new Error(`Unknown component key: ${key}`)
      components[key] = makeDefault(schema)
    }
    const entity: Entity = { id, components }
    this.pushHistory(this.scene)
    this.scene = {
      entities: [...this.scene.entities, entity],
      selectedEntityId: this.scene.selectedEntityId,
    }
    this.emit()
    return id
  }

  // Create an entity (which must include a 'transform' component) at a specific
  // position and size, then select it — all as a single undoable step. Used by
  // canvas drag-to-draw. Aborts cleanly (no partial entity) if 'transform' is absent.
  addEntityWithTransform = (
    componentKeys: readonly string[],
    transform: { x: number; y: number; width: number; height: number },
  ): EntityId => {
    this.beginTransaction()
    try {
      const id = this.addEntity(componentKeys)
      this.setFields(id, 'transform', { ...transform })
      this.selectEntity(id)
      this.commitTransaction()
      return id
    } catch (err) {
      this.abortTransaction()
      throw err
    }
  }

  selectEntity = (id: EntityId | null): void => {
    if (this.scene.selectedEntityId === id) return
    this.pushHistory(this.scene)
    this.scene = { entities: this.scene.entities, selectedEntityId: id }
    this.emit()
  }

  setField = (
    id: EntityId,
    componentKey: string,
    fieldName: string,
    value: unknown,
  ): void => {
    this.setFields(id, componentKey, { [fieldName]: value })
  }

  setFields = (
    id: EntityId,
    componentKey: string,
    partial: Record<string, unknown>,
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
        [componentKey]: { ...oldComponent, ...partial },
      },
    }
    const nextEntities = entities.slice()
    nextEntities[idx] = next
    this.pushHistory(this.scene)
    this.scene = {
      entities: nextEntities,
      selectedEntityId: this.scene.selectedEntityId,
    }
    this.emit()
  }

  addComponent = (id: EntityId, componentKey: string): void => {
    this.beginTransaction()
    try {
      const schema = REGISTRY[componentKey]
      if (!schema) throw new Error(`Unknown component key: ${componentKey}`)
      const entities = this.scene.entities
      const idx = entities.findIndex(e => e.id === id)
      const old = entities[idx]
      if (!old) throw new Error(`Entity not found: ${id}`)
      if (componentKey in old.components) {
        throw new Error(`Entity ${id} already has '${componentKey}'`)
      }
      for (const req of schema.requires ?? []) {
        if (!(req in old.components)) {
          throw new Error(`'${componentKey}' requires '${req}' (missing on entity ${id})`)
        }
      }
      const next: Entity = {
        id: old.id,
        components: { ...old.components, [componentKey]: makeDefault(schema) },
      }
      const nextEntities = entities.slice()
      nextEntities[idx] = next
      this.scene = {
        entities: nextEntities,
        selectedEntityId: this.scene.selectedEntityId,
      }
      this.emit()
      this.commitTransaction()
    } catch (err) {
      this.abortTransaction()
      throw err
    }
  }

  removeComponent = (id: EntityId, componentKey: string): void => {
    this.beginTransaction()
    try {
      const entities = this.scene.entities
      const idx = entities.findIndex(e => e.id === id)
      const old = entities[idx]
      if (!old) throw new Error(`Entity not found: ${id}`)
      if (!(componentKey in old.components)) {
        throw new Error(`Entity ${id} has no '${componentKey}' component`)
      }
      // Reject if any other component on this entity declares componentKey in its requires.
      for (const otherKey of Object.keys(old.components)) {
        if (otherKey === componentKey) continue
        const other = REGISTRY[otherKey]
        if (other?.requires?.includes(componentKey)) {
          throw new Error(`Cannot remove '${componentKey}': '${otherKey}' requires it`)
        }
      }
      const nextComponents = { ...old.components }
      delete nextComponents[componentKey]
      const next: Entity = { id: old.id, components: nextComponents }
      const nextEntities = entities.slice()
      nextEntities[idx] = next
      this.scene = {
        entities: nextEntities,
        selectedEntityId: this.scene.selectedEntityId,
      }
      this.emit()
      this.commitTransaction()
    } catch (err) {
      this.abortTransaction()
      throw err
    }
  }

  beginTransaction = (): void => {
    if (this.txOpen) throw new Error('beginTransaction: a transaction is already open')
    this.txOpen = true
    this.txStartScene = this.scene
  }

  commitTransaction = (): void => {
    if (!this.txOpen) throw new Error('commitTransaction: no open transaction')
    const start = this.txStartScene!
    this.txOpen = false
    this.txStartScene = null
    if (start !== this.scene) {
      this.history.push(start)
      if (this.history.length > HISTORY_CAP) this.history.shift()
      this.redoStack = []
    }
    this.emit()
  }

  abortTransaction = (): void => {
    if (!this.txOpen) throw new Error('abortTransaction: no open transaction')
    const start = this.txStartScene!
    this.txOpen = false
    this.txStartScene = null
    this.scene = start
    this.emit()
  }

  undo = (): void => {
    if (this.history.length === 0) return
    this.redoStack.push(this.scene)
    this.scene = this.history.pop()!
    this.emit()
  }

  redo = (): void => {
    if (this.redoStack.length === 0) return
    this.history.push(this.scene)
    if (this.history.length > HISTORY_CAP) this.history.shift()
    this.scene = this.redoStack.pop()!
    this.emit()
  }

  private pushHistory = (prev: Scene): void => {
    if (this.txOpen) return
    this.history.push(prev)
    if (this.history.length > HISTORY_CAP) this.history.shift()
    this.redoStack = []
  }

  private emit = (): void => {
    this.cachedSnapshot = null
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
