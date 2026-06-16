import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { AssetStore } from '../../assets/AssetStore'
import type { EditorCore } from '../../core/EditorCore'
import type { EntityId } from '../../core/types'
import type { Sprite } from '../../schemas/sprite'
import { spriteSchema } from '../../schemas/sprite'
import type { Transform } from '../../schemas/transform'
import { transformSchema } from '../../schemas/transform'
import { abgrAlpha, abgrToRgbHex } from '../colour'
import { useAssets } from '../hooks/useAssets'
import { useScene } from '../hooks/useScene'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  isDrawable,
  rectFromDrag,
  snapRectSizeToPowerOfTwo,
} from './draftRect'
import type { DraftRect } from './draftRect'
import { screenToCanvas } from './screenToCanvas'
import type { CanvasPoint } from './screenToCanvas'

interface Props {
  core: EditorCore
  assetStore: AssetStore
}

interface DragState {
  entityId: EntityId
  pointerId: number
  startCanvas: { x: number; y: number }
  startEntity: { x: number; y: number }
}

interface DrawState {
  pointerId: number
  start: CanvasPoint
}

export function Canvas({ core, assetStore }: Props) {
  const scene = useScene(core)
  const assets = useAssets(assetStore)
  const textureById = new Map(assets.map(a => [a.id, a]))
  const dragRef = useRef<DragState | null>(null)
  const drawRef = useRef<DrawState | null>(null)
  const [draft, setDraft] = useState<DraftRect | null>(null)

  const onPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    entityId: EntityId,
    transform: Transform,
  ) => {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    core.beginTransaction()
    core.selectEntity(entityId)
    e.currentTarget.setPointerCapture(e.pointerId)
    const start = screenToCanvas(svg, e.clientX, e.clientY)
    dragRef.current = {
      entityId,
      pointerId: e.pointerId,
      startCanvas: start,
      startEntity: { x: transform.x, y: transform.y },
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const here = screenToCanvas(svg, e.clientX, e.clientY)
    const nextX = drag.startEntity.x + (here.x - drag.startCanvas.x)
    const nextY = drag.startEntity.y + (here.y - drag.startCanvas.y)
    core.setFields(drag.entityId, transformSchema.key, { x: nextX, y: nextY })
  }

  const onPointerUp = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
    core.commitTransaction()
  }

  const onPointerCancel = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
    core.abortTransaction()
  }

  // Drag on the empty background to draw a new entity's bounding box. A press on
  // an existing rect bubbles here too, so we only start a draw when the press
  // landed on the SVG itself (the rect's own handlers own that gesture).
  const onCanvasPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return
    const svg = e.currentTarget
    svg.setPointerCapture(e.pointerId)
    const start = screenToCanvas(svg, e.clientX, e.clientY)
    drawRef.current = { pointerId: e.pointerId, start }
    setDraft(snapRectSizeToPowerOfTwo(rectFromDrag(start, start)))
  }

  const onCanvasPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const draw = drawRef.current
    if (!draw || draw.pointerId !== e.pointerId) return
    const here = screenToCanvas(e.currentTarget, e.clientX, e.clientY)
    // Preview the snapped size so the user sees the power-of-two box they'll get.
    setDraft(snapRectSizeToPowerOfTwo(rectFromDrag(draw.start, here)))
  }

  const onCanvasPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const draw = drawRef.current
    if (!draw || draw.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    drawRef.current = null
    const raw = rectFromDrag(draw.start, screenToCanvas(e.currentTarget, e.clientX, e.clientY))
    setDraft(null)
    if (isDrawable(raw)) {
      core.addEntityWithTransform([transformSchema.key], snapRectSizeToPowerOfTwo(raw))
    } else {
      // A click on empty space (no meaningful drag) clears the selection.
      core.selectEntity(null)
    }
  }

  const onCanvasPointerCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    const draw = drawRef.current
    if (!draw || draw.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    drawRef.current = null
    setDraft(null)
  }

  return (
    <svg
      className="canvas"
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerCancel={onCanvasPointerCancel}
    >
      {scene.entities.map(entity => {
        const transform = entity.components[transformSchema.key] as Transform | undefined
        if (!transform) return null
        const selected = scene.selectedEntityId === entity.id
        const sprite = entity.components[spriteSchema.key] as Sprite | undefined
        const texture = sprite ? textureById.get(sprite.global_texture_id) : undefined

        // Three render states mirror the engine (Engine.md §5.2/§11):
        //   textured           → show the bitmap, rect is just an invisible hit target
        //   sprite, no texture → solid colour_tint rect (the engine's missing-asset fallback)
        //   no sprite          → neutral placeholder rect (styled in CSS)
        const rectStyle: React.CSSProperties = texture
          ? { fill: 'transparent', pointerEvents: 'all' }
          : sprite
            ? { fill: abgrToRgbHex(sprite.colour_tint), fillOpacity: abgrAlpha(sprite.colour_tint) / 255 }
            : {}

        return (
          <g key={entity.id}>
            {texture && (
              <image
                href={texture.objectURL}
                x={transform.x}
                y={transform.y}
                width={transform.width}
                height={transform.height}
                preserveAspectRatio="none"
                pointerEvents="none"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <rect
              x={transform.x}
              y={transform.y}
              width={transform.width}
              height={transform.height}
              data-selected={selected || undefined}
              style={rectStyle}
              onPointerDown={e => onPointerDown(e, entity.id, transform)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            />
          </g>
        )
      })}
      {draft && (
        <rect
          className="canvas-draft"
          x={draft.x}
          y={draft.y}
          width={draft.width}
          height={draft.height}
        />
      )}
    </svg>
  )
}
