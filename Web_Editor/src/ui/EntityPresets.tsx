import type { EditorCore } from '../core/EditorCore'
import { transformSchema } from '../schemas/transform'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './canvas/draftRect'

interface Props {
  core: EditorCore
}

interface Preset {
  id: string
  label: string
  components: readonly string[]
}

const PRESETS: readonly Preset[] = [
  { id: 'empty',        label: 'Empty',        components: [] },
  { id: 'sprite',       label: 'Sprite',       components: ['transform', 'sprite'] },
  { id: 'static-solid', label: 'Static Solid', components: ['transform', 'collider'] },
  { id: 'dynamic',      label: 'Dynamic',      components: ['transform', 'physics', 'collider'] },
]

// Matches the transform schema's width/height defaults; toolbar-spawned entities
// appear centered (rather than tucked at 0,0) so they're immediately visible.
const DEFAULT_ENTITY_SIZE = 32

function spawnPreset(core: EditorCore, components: readonly string[]): void {
  if (components.includes(transformSchema.key)) {
    core.addEntityWithTransform(components, {
      x: Math.round((CANVAS_WIDTH - DEFAULT_ENTITY_SIZE) / 2),
      y: Math.round((CANVAS_HEIGHT - DEFAULT_ENTITY_SIZE) / 2),
      width: DEFAULT_ENTITY_SIZE,
      height: DEFAULT_ENTITY_SIZE,
    })
  } else {
    core.addEntity(components)
  }
}

export function EntityPresets({ core }: Props) {
  return (
    <select
      className="entity-preset-select"
      value=""
      onChange={e => {
        const preset = PRESETS.find(p => p.id === e.currentTarget.value)
        if (preset) spawnPreset(core, preset.components)
        e.currentTarget.value = ''
      }}
    >
      <option value="" disabled>Add Entity…</option>
      {PRESETS.map(p => (
        <option key={p.id} value={p.id}>{p.label}</option>
      ))}
    </select>
  )
}
