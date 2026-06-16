import { describe, it, expect } from 'vitest'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  isDrawable,
  MIN_DRAW_SIZE,
  rectFromDrag,
  snapRectSizeToPowerOfTwo,
} from './draftRect'

describe('rectFromDrag', () => {
  it('builds a rect when dragging down-right', () => {
    expect(rectFromDrag({ x: 10, y: 20 }, { x: 50, y: 60 })).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 40,
    })
  })

  it('normalizes a drag in any direction (up-left) to a positive rect', () => {
    expect(rectFromDrag({ x: 50, y: 60 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 40,
    })
  })

  it('rounds fractional canvas coordinates to whole transform values', () => {
    expect(rectFromDrag({ x: 10.4, y: 20.6 }, { x: 50.6, y: 60.4 })).toEqual({
      x: 10,
      y: 21,
      width: 40,
      height: 40,
    })
  })

  it('clamps endpoints to the canvas bounds', () => {
    const rect = rectFromDrag({ x: -100, y: -100 }, { x: 9999, y: 9999 })
    expect(rect).toEqual({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  })

  it('collapses a zero-distance drag (a click) to an empty rect', () => {
    expect(rectFromDrag({ x: 100, y: 100 }, { x: 100, y: 100 })).toEqual({
      x: 100,
      y: 100,
      width: 0,
      height: 0,
    })
  })
})

describe('isDrawable', () => {
  it('rejects rects below the minimum on either axis', () => {
    expect(isDrawable({ x: 0, y: 0, width: 0, height: 0 })).toBe(false)
    expect(isDrawable({ x: 0, y: 0, width: MIN_DRAW_SIZE - 1, height: 100 })).toBe(false)
    expect(isDrawable({ x: 0, y: 0, width: 100, height: MIN_DRAW_SIZE - 1 })).toBe(false)
  })

  it('accepts rects at or above the minimum on both axes', () => {
    expect(isDrawable({ x: 0, y: 0, width: MIN_DRAW_SIZE, height: MIN_DRAW_SIZE })).toBe(true)
    expect(isDrawable({ x: 0, y: 0, width: 32, height: 32 })).toBe(true)
  })
})

describe('snapRectSizeToPowerOfTwo', () => {
  it('snaps width and height to powers of two while pinning the top-left', () => {
    expect(snapRectSizeToPowerOfTwo({ x: 12, y: 34, width: 30, height: 70 })).toEqual({
      x: 12,
      y: 34,
      width: 32,
      height: 64,
    })
  })
})
