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

  it('addComponent appends a component with default fields', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.addComponent(id, 'physics')
    const entity = core.getSnapshot().entities[0]!
    expect(Object.keys(entity.components).sort()).toEqual(['physics', 'transform'])
    expect(entity.components.physics).toEqual({
      vx: 0,
      vy: 0,
      gravity_magnitude: 0.5,
      gravity_direction: 0,
    })
  })

  it('addComponent rejects unknown keys', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    expect(() => core.addComponent(id, 'mystery')).toThrow()
  })

  it('addComponent rejects when requires are missing', () => {
    const core = new EditorCore()
    const id = core.addEntity([]) // no transform
    expect(() => core.addComponent(id, 'physics')).toThrow(/requires/)
  })

  it('addComponent rejects duplicate components', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    expect(() => core.addComponent(id, 'transform')).toThrow()
  })

  it('addComponent failure does not mutate the scene', () => {
    const core = new EditorCore()
    const id = core.addEntity([])
    const before = core.getSnapshot()
    expect(() => core.addComponent(id, 'physics')).toThrow()
    expect(core.getSnapshot().entities).toBe(before.entities)
  })

  it('addComponent is one undo step', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.addComponent(id, 'physics')
    core.undo()
    expect(Object.keys(core.getSnapshot().entities[0]!.components)).toEqual(['transform'])
  })

  it('removeComponent removes the component', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform', 'physics'])
    core.removeComponent(id, 'physics')
    expect(Object.keys(core.getSnapshot().entities[0]!.components)).toEqual(['transform'])
  })

  it('removeComponent rejects when another component requires it', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform', 'physics', 'collider'])
    // collider requires transform, physics requires transform → can't remove transform
    expect(() => core.removeComponent(id, 'transform')).toThrow(/requires/)
  })

  it('removeComponent rejects when the component is not on the entity', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    expect(() => core.removeComponent(id, 'physics')).toThrow()
  })

  it('removeComponent is one undo step', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform', 'physics'])
    core.removeComponent(id, 'physics')
    core.undo()
    expect(Object.keys(core.getSnapshot().entities[0]!.components).sort()).toEqual(['physics', 'transform'])
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
