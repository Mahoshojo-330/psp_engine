import { describe, it, expect, vi } from 'vitest'
import { EditorCore } from './EditorCore'

describe('EditorCore', () => {
  it('starts with an empty scene and no selection', () => {
    const core = new EditorCore()
    const scene = core.getSnapshot()
    expect(scene.entities).toEqual([])
    expect(scene.selectedEntityId).toBeNull()
  })

  it('addEntity appends an entity with default transform fields', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    const scene = core.getSnapshot()
    expect(scene.entities).toHaveLength(1)
    expect(scene.entities[0]?.id).toBe(id)
    expect(scene.entities[0]?.components.transform).toEqual({
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    })
  })

  it('addEntity assigns monotonically increasing ids', () => {
    const core = new EditorCore()
    const a = core.addEntity(['transform'])
    const b = core.addEntity(['transform'])
    const c = core.addEntity(['transform'])
    expect([a, b, c]).toEqual([1, 2, 3])
  })

  it('addEntity throws on an unknown component key', () => {
    const core = new EditorCore()
    expect(() => core.addEntity(['definitely-not-a-real-component'])).toThrow()
  })

  it('selectEntity persists the selected id in the snapshot', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.selectEntity(id)
    expect(core.getSnapshot().selectedEntityId).toBe(id)
    core.selectEntity(null)
    expect(core.getSnapshot().selectedEntityId).toBeNull()
  })

  it('setField updates the targeted component field', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.setField(id, 'transform', 'x', 100)
    core.setField(id, 'transform', 'height', 64)
    expect(core.getSnapshot().entities[0]?.components.transform).toEqual({
      x: 100,
      y: 0,
      width: 32,
      height: 64,
    })
  })

  it('setFields applies a partial update in a single emit', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    const listener = vi.fn()
    core.subscribe(listener)
    core.setFields(id, 'transform', { x: 10, y: 20 })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(core.getSnapshot().entities[0]?.components.transform).toEqual({
      x: 10,
      y: 20,
      width: 32,
      height: 32,
    })
  })

  it('setField throws when the entity does not exist', () => {
    const core = new EditorCore()
    expect(() => core.setField(999, 'transform', 'x', 0)).toThrow()
  })

  it('setField throws when the component is missing on the entity', () => {
    const core = new EditorCore()
    const id = core.addEntity([])
    expect(() => core.setField(id, 'transform', 'x', 0)).toThrow()
  })

  it('subscribe fires listeners on mutation and stops after unsubscribe', () => {
    const core = new EditorCore()
    const listener = vi.fn()
    const unsubscribe = core.subscribe(listener)

    const id = core.addEntity(['transform'])
    expect(listener).toHaveBeenCalledTimes(1)

    core.setField(id, 'transform', 'x', 5)
    expect(listener).toHaveBeenCalledTimes(2)

    core.selectEntity(id)
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    core.addEntity(['transform'])
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('selectEntity is a no-op when the id is unchanged', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.selectEntity(id)
    const listener = vi.fn()
    core.subscribe(listener)
    core.selectEntity(id)
    expect(listener).not.toHaveBeenCalled()
  })

  it('getSnapshot returns a stable reference until the scene changes', () => {
    const core = new EditorCore()
    const before = core.getSnapshot()
    expect(core.getSnapshot()).toBe(before)
    core.addEntity(['transform'])
    expect(core.getSnapshot()).not.toBe(before)
  })

  it('mutations do not mutate prior snapshots', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    const snapshotBefore = core.getSnapshot()
    const entitiesBefore = snapshotBefore.entities
    const transformBefore = snapshotBefore.entities[0]?.components.transform

    core.setField(id, 'transform', 'x', 42)

    expect(snapshotBefore.entities).toBe(entitiesBefore)
    expect(snapshotBefore.entities[0]?.components.transform).toBe(transformBefore)
    expect((transformBefore as { x: number }).x).toBe(0)
  })
})
