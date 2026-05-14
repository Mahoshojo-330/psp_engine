import type { EditorCore } from '../core/EditorCore'

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
  { id: 'static-solid', label: 'Static Solid', components: ['transform', 'collider'] },
  { id: 'dynamic',      label: 'Dynamic',      components: ['transform', 'physics', 'collider'] },
]

export function EntityPresets({ core }: Props) {
  return (
    <select
      className="entity-preset-select"
      value=""
      onChange={e => {
        const preset = PRESETS.find(p => p.id === e.currentTarget.value)
        if (preset) core.addEntity(preset.components)
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
