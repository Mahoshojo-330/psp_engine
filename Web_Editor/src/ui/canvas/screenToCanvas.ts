export interface CanvasPoint {
  x: number
  y: number
}

export function screenToCanvas(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): CanvasPoint {
  const ctm = svg.getScreenCTM()
  if (!ctm) throw new Error('screenToCanvas: SVG has no CTM (detached from document?)')
  const { a, b, c, d, e, f } = ctm
  const det = a * d - b * c
  if (det === 0) throw new Error('screenToCanvas: CTM is non-invertible')
  const ia =  d / det
  const ib = -b / det
  const ic = -c / det
  const id =  a / det
  const ie = (c * f - d * e) / det
  const ifv = (b * e - a * f) / det
  return {
    x: ia * clientX + ic * clientY + ie,
    y: ib * clientX + id * clientY + ifv,
  }
}
