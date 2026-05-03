import { describe, it, expect } from 'vitest'
import { screenToCanvas } from './screenToCanvas'

interface CTMLike { a: number; b: number; c: number; d: number; e: number; f: number }

function makeSvg(ctm: CTMLike | null): SVGSVGElement {
  return {
    getScreenCTM: () => ctm,
  } as unknown as SVGSVGElement
}

describe('screenToCanvas', () => {
  it('inverts a pure translation', () => {
    // Canvas is offset 100px right, 50px down on screen, no scaling.
    const svg = makeSvg({ a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 })
    expect(screenToCanvas(svg, 150, 80)).toEqual({ x: 50, y: 30 })
  })

  it('inverts a uniform 2x scale + translation', () => {
    // 1 canvas unit = 2 screen px; canvas origin is at screen (100, 50).
    const svg = makeSvg({ a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 })
    expect(screenToCanvas(svg, 200, 150)).toEqual({ x: 50, y: 50 })
  })

  it('inverts identity (client coords pass through)', () => {
    const svg = makeSvg({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    expect(screenToCanvas(svg, 42, 7)).toEqual({ x: 42, y: 7 })
  })

  it('throws when getScreenCTM returns null', () => {
    const svg = makeSvg(null)
    expect(() => screenToCanvas(svg, 0, 0)).toThrow(/no CTM/)
  })

  it('throws when CTM is non-invertible', () => {
    // Zero determinant.
    const svg = makeSvg({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })
    expect(() => screenToCanvas(svg, 0, 0)).toThrow(/non-invertible/)
  })
})
