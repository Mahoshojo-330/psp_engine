import { describe, it, expect, vi } from 'vitest'
import { EditorCore } from './EditorCore'

describe('EditorCore history', () => {
  it('starts with neither undo nor redo available', () => {
    const core = new EditorCore()
    const snap = core.getSnapshot()
    expect(snap.canUndo).toBe(false)
    expect(snap.canRedo).toBe(false)
  })

  it('addEntity is undoable; redo replays', () => {
    const core = new EditorCore()
    core.addEntity(['transform'])
    expect(core.getSnapshot().entities).toHaveLength(1)
    expect(core.getSnapshot().canUndo).toBe(true)

    core.undo()
    expect(core.getSnapshot().entities).toHaveLength(0)
    expect(core.getSnapshot().canUndo).toBe(false)
    expect(core.getSnapshot().canRedo).toBe(true)

    core.redo()
    expect(core.getSnapshot().entities).toHaveLength(1)
    expect(core.getSnapshot().canRedo).toBe(false)
  })

  it('setField is undoable; restores prior value', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.setField(id, 'transform', 'x', 100)
    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(100)

    core.undo()
    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(0)

    core.redo()
    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(100)
  })

  it('selectEntity participates in history', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.selectEntity(id)
    expect(core.getSnapshot().selectedEntityId).toBe(id)

    core.undo()
    expect(core.getSnapshot().selectedEntityId).toBeNull()
  })

  it('a fresh mutation after undo clears the redo stack', () => {
    const core = new EditorCore()
    core.addEntity(['transform'])
    core.addEntity(['transform'])
    core.undo()
    expect(core.getSnapshot().canRedo).toBe(true)
    core.addEntity(['transform'])
    expect(core.getSnapshot().canRedo).toBe(false)
  })

  it('undo with empty history is a no-op', () => {
    const core = new EditorCore()
    const listener = vi.fn()
    core.subscribe(listener)
    core.undo()
    expect(listener).not.toHaveBeenCalled()
    expect(core.getSnapshot().entities).toHaveLength(0)
  })

  it('redo with empty stack is a no-op', () => {
    const core = new EditorCore()
    core.addEntity(['transform'])
    const listener = vi.fn()
    core.subscribe(listener)
    core.redo()
    expect(listener).not.toHaveBeenCalled()
  })

  it('transaction collapses N internal mutations into one history entry', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    expect(core.getSnapshot().canUndo).toBe(true) // from addEntity

    core.beginTransaction()
    core.setField(id, 'transform', 'x', 10)
    core.setField(id, 'transform', 'x', 20)
    core.setField(id, 'transform', 'x', 30)
    core.commitTransaction()

    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(30)

    core.undo() // undoes the whole transaction in one step
    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(0)

    core.undo() // undoes the addEntity
    expect(core.getSnapshot().entities).toHaveLength(0)
  })

  it('mutations during a transaction still emit live (so canvas updates)', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    const listener = vi.fn()
    core.subscribe(listener)

    core.beginTransaction()
    core.setField(id, 'transform', 'x', 5)
    core.setField(id, 'transform', 'x', 10)
    expect(listener).toHaveBeenCalledTimes(2) // two live emits
    core.commitTransaction()
    expect(listener).toHaveBeenCalledTimes(3) // plus one on commit
  })

  it('empty transaction (begin → commit with no mutations) does not push history', () => {
    const core = new EditorCore()
    core.addEntity(['transform']) // history: [scene-empty]
    core.beginTransaction()
    core.commitTransaction()
    core.undo()
    expect(core.getSnapshot().entities).toHaveLength(0) // the addEntity, not a phantom
    expect(core.getSnapshot().canUndo).toBe(false)
  })

  it('aborted transaction restores the pre-begin scene; history unchanged', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.setField(id, 'transform', 'x', 100)
    const before = core.getSnapshot()

    core.beginTransaction()
    core.setField(id, 'transform', 'x', 200)
    core.setField(id, 'transform', 'x', 300)
    core.abortTransaction()

    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(100)
    expect(core.getSnapshot().canUndo).toBe(before.canUndo)
    expect(core.getSnapshot().canRedo).toBe(before.canRedo)
  })

  it('aborted transaction does not consume the redo stack', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform'])
    core.setField(id, 'transform', 'x', 100)
    core.undo() // x back to 0; redo stack non-empty
    expect(core.getSnapshot().canRedo).toBe(true)

    core.beginTransaction()
    core.setField(id, 'transform', 'x', 999)
    core.abortTransaction()

    expect(core.getSnapshot().canRedo).toBe(true)
    core.redo()
    expect((core.getSnapshot().entities[0]?.components.transform as { x: number }).x).toBe(100)
  })

  it('beginTransaction throws when one is already open', () => {
    const core = new EditorCore()
    core.beginTransaction()
    expect(() => core.beginTransaction()).toThrow()
    core.commitTransaction()
  })

  it('commit/abort throw when no transaction is open', () => {
    const core = new EditorCore()
    expect(() => core.commitTransaction()).toThrow()
    expect(() => core.abortTransaction()).toThrow()
  })

  it('history is capped at 100 entries (oldest dropped)', () => {
    const core = new EditorCore()
    const id = core.addEntity(['transform']) // history depth 1
    // 105 setField calls; cap is 100. After: every undo should land on a real prior snapshot,
    // and the very first scene (pre-addEntity, empty) should NO LONGER be reachable.
    for (let i = 1; i <= 105; i++) {
      core.setField(id, 'transform', 'x', i)
    }
    // Undo 100 times — should not throw and should not crash.
    for (let i = 0; i < 100; i++) core.undo()
    // Further undos are no-ops (dropped oldest).
    expect(core.getSnapshot().canUndo).toBe(false)
    // Entity still exists (its addEntity history was pushed off the back).
    expect(core.getSnapshot().entities).toHaveLength(1)
  })

  it('getSnapshot reference invalidates only on emit', () => {
    const core = new EditorCore()
    const a = core.getSnapshot()
    expect(core.getSnapshot()).toBe(a)
    core.addEntity(['transform'])
    const b = core.getSnapshot()
    expect(b).not.toBe(a)
    expect(core.getSnapshot()).toBe(b)
  })
})
