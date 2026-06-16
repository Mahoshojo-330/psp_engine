import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { EntityPresets } from './EntityPresets'
import { EditorCore } from '../core/EditorCore'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './canvas/draftRect'

afterEach(cleanup)

interface TransformData {
  x: number
  y: number
  width: number
  height: number
}

describe('EntityPresets', () => {
  it('spawns a transform-bearing preset centered in the canvas and selects it', () => {
    const core = new EditorCore()
    const { container } = render(<EntityPresets core={core} />)
    const select = container.querySelector('select')!

    fireEvent.change(select, { target: { value: 'dynamic' } })

    const scene = core.getSnapshot()
    expect(scene.entities).toHaveLength(1)
    const t = scene.entities[0]!.components.transform as TransformData
    expect(t.x).toBe(Math.round((CANVAS_WIDTH - t.width) / 2))
    expect(t.y).toBe(Math.round((CANVAS_HEIGHT - t.height) / 2))
    expect(scene.selectedEntityId).toBe(scene.entities[0]!.id)
  })

  it('spawns a Sprite preset with transform + sprite, centered and selected', () => {
    const core = new EditorCore()
    const { container } = render(<EntityPresets core={core} />)
    const select = container.querySelector('select')!

    fireEvent.change(select, { target: { value: 'sprite' } })

    const scene = core.getSnapshot()
    expect(scene.entities).toHaveLength(1)
    const entity = scene.entities[0]!
    expect(Object.keys(entity.components).sort()).toEqual(['sprite', 'transform'])
    const t = entity.components.transform as TransformData
    expect(t.x).toBe(Math.round((CANVAS_WIDTH - t.width) / 2))
    expect(t.y).toBe(Math.round((CANVAS_HEIGHT - t.height) / 2))
    expect(scene.selectedEntityId).toBe(entity.id)
  })

  it('spawns an Empty preset (no transform) without positioning it', () => {
    const core = new EditorCore()
    const { container } = render(<EntityPresets core={core} />)
    const select = container.querySelector('select')!

    fireEvent.change(select, { target: { value: 'empty' } })

    const scene = core.getSnapshot()
    expect(scene.entities).toHaveLength(1)
    expect(scene.entities[0]!.components).toEqual({})
  })
})
