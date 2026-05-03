import type { EditorCore } from '../core/EditorCore'
import { useScene } from './hooks/useScene'

interface Props {
  core: EditorCore
}

export function EntityList({ core }: Props) {
  const scene = useScene(core)

  if (scene.entities.length === 0) {
    return <p className="entity-list-empty">No entities yet.</p>
  }

  return (
    <ul className="entity-list" role="listbox" aria-label="Entities">
      {scene.entities.map(entity => {
        const selected = scene.selectedEntityId === entity.id
        return (
          <li
            key={entity.id}
            role="option"
            aria-selected={selected}
            onClick={() => core.selectEntity(entity.id)}
          >
            #{entity.id}
          </li>
        )
      })}
    </ul>
  )
}
