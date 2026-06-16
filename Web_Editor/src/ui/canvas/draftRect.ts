import { snapToPowerOfTwo } from '../snap'
import type { CanvasPoint } from './screenToCanvas'

// PSP framebuffer dimensions; the canvas viewBox matches these (Engine.md §6).
export const CANVAS_WIDTH = 480
export const CANVAS_HEIGHT = 272

// A drag shorter than this (in canvas units, either axis) is treated as a click,
// not a draw — so tapping empty space clears the selection instead of spawning
// a sliver of an entity.
export const MIN_DRAW_SIZE = 3

export interface DraftRect {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi)
}

/**
 * Build an integer, axis-aligned rectangle from two drag endpoints. Endpoints may
 * arrive in any order (drag up-left as easily as down-right); the result is
 * normalized to a positive width/height, clamped to the canvas, and rounded so
 * transform fields stay whole numbers.
 */
export function rectFromDrag(start: CanvasPoint, end: CanvasPoint): DraftRect {
  const x1 = clamp(Math.min(start.x, end.x), 0, CANVAS_WIDTH)
  const y1 = clamp(Math.min(start.y, end.y), 0, CANVAS_HEIGHT)
  const x2 = clamp(Math.max(start.x, end.x), 0, CANVAS_WIDTH)
  const y2 = clamp(Math.max(start.y, end.y), 0, CANVAS_HEIGHT)
  return {
    x: Math.round(x1),
    y: Math.round(y1),
    width: Math.round(x2 - x1),
    height: Math.round(y2 - y1),
  }
}

/** Whether a draft is big enough to become an entity (vs. a click-to-deselect). */
export function isDrawable(rect: DraftRect): boolean {
  return rect.width >= MIN_DRAW_SIZE && rect.height >= MIN_DRAW_SIZE
}

/**
 * Hard-snap a draft's size to power-of-two dimensions (PSP texture sizing), keeping
 * its top-left corner fixed. The drag preview shows the snapped size so the user
 * sees exactly what they'll get on release.
 */
export function snapRectSizeToPowerOfTwo(rect: DraftRect): DraftRect {
  return {
    x: rect.x,
    y: rect.y,
    width: snapToPowerOfTwo(rect.width),
    height: snapToPowerOfTwo(rect.height),
  }
}
