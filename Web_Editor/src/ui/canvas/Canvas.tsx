import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { EditorCore } from '../../core/EditorCore'
import type { EntityId } from '../../core/types'
import type { Transform } from '../../schemas/transform'
import { transformSchema } from '../../schemas/transform'
import { useScene } from '../hooks/useScene'
import { screenToCanvas } from './screenToCanvas'

interface Props {
  core: EditorCore
}

interface DragState {
  entityId: EntityId
  pointerId: number
  startCanvas: { x: number; y: number }
  startEntity: { x: number; y: number }
}

export function Canvas({ core }: Props) {
  const scene = useScene(core)
  const dragRef = useRef<DragState | null>(null)

  const onPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    entityId: EntityId,
    transform: Transform,
  ) => {
    core.selectEntity(entityId)
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
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
    core.setField(drag.entityId, transformSchema.key, 'x', nextX)
    core.setField(drag.entityId, transformSchema.key, 'y', nextY)
  }

  const endDrag = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }

  return (
    <svg
      className="canvas"
      viewBox="0 0 480 272"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {scene.entities.map(entity => {
        const transform = entity.components[transformSchema.key] as Transform | undefined
        if (!transform) return null
        const selected = scene.selectedEntityId === entity.id
        return (
          <rect
            key={entity.id}
            x={transform.x}
            y={transform.y}
            width={transform.width}
            height={transform.height}
            aria-selected={selected}
            onPointerDown={e => onPointerDown(e, entity.id, transform)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        )
      })}
    </svg>
  )
}
