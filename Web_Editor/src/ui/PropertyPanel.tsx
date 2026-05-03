import type { EditorCore } from '../core/EditorCore'
import type { FieldSchema } from '../core/types'
import { transformSchema } from '../schemas/transform'
import { useScene } from './hooks/useScene'

interface Props {
  core: EditorCore
}

export function PropertyPanel({ core }: Props) {
  const scene = useScene(core)
  const entity =
    scene.selectedEntityId == null
      ? undefined
      : scene.entities.find(e => e.id === scene.selectedEntityId)

  if (!entity) {
    return (
      <div className="property-panel">
        <p className="property-panel-empty">No selection</p>
      </div>
    )
  }

  const transform = entity.components[transformSchema.key] as
    | Record<string, number>
    | undefined

  if (!transform) {
    return (
      <div className="property-panel">
        <p className="property-panel-empty">
          Entity #{entity.id} has no {transformSchema.label} component
        </p>
      </div>
    )
  }

  return (
    <div className="property-panel">
      <h2>{transformSchema.label}</h2>
      {transformSchema.fields.map(field => (
        <FieldInput
          key={field.name}
          field={field}
          value={transform[field.name] ?? 0}
          onChange={value =>
            core.setField(entity.id, transformSchema.key, field.name, value)
          }
        />
      ))}
    </div>
  )
}

interface FieldInputProps {
  field: FieldSchema
  value: number
  onChange: (value: number) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const inputId = `field-${field.name}`
  const isInt = field.kind.kind === 'int'
  return (
    <div className="field">
      <label htmlFor={inputId}>{field.label}</label>
      <input
        id={inputId}
        type="number"
        step={isInt ? 1 : 'any'}
        value={value}
        onChange={e => {
          const raw = e.currentTarget.value
          if (raw === '') return
          const parsed = isInt ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </div>
  )
}
