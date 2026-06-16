import { useEffect, useRef, useState } from 'react'
import type { AssetStore } from '../assets/AssetStore'
import type { EditorCore } from '../core/EditorCore'
import type { ComponentSchema, Entity, FieldSchema } from '../core/types'
import { REGISTRY } from '../schemas/registry'
import { spriteSchema } from '../schemas/sprite'
import { useScene } from './hooks/useScene'
import { snapToPowerOfTwo } from './snap'
import { SpriteControl } from './SpriteControl'

interface Props {
  core: EditorCore
  assetStore: AssetStore
}

export function PropertyPanel({ core, assetStore }: Props) {
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

  const componentKeys = Object.keys(entity.components)
  const handleAdd = (key: string) => {
    try {
      core.addComponent(entity.id, key)
    } catch (err) {
      console.warn('addComponent failed:', err)
    }
  }
  const handleRemove = (key: string) => {
    try {
      core.removeComponent(entity.id, key)
    } catch (err) {
      console.warn('removeComponent failed:', err)
    }
  }

  return (
    <div className="property-panel">
      {componentKeys.length === 0 && (
        <p className="property-panel-empty">Entity #{entity.id} has no components</p>
      )}
      {componentKeys.map(key => {
        const schema = REGISTRY[key]
        if (!schema) {
          return (
            <ComponentSection key={key} title={key}>
              <p className="property-panel-empty">Unknown component: {key}</p>
            </ComponentSection>
          )
        }
        const required = isRequiredByPeer(entity, key)
        const data = entity.components[key]
        return (
          <ComponentSection
            key={key}
            title={schema.label}
            onRemove={() => handleRemove(key)}
            removeDisabled={required}
            removeTitle={required ? 'Required by another component on this entity' : undefined}
          >
            {key === spriteSchema.key ? (
              <SpriteControl core={core} entityId={entity.id} data={data} assetStore={assetStore} />
            ) : (
              <ComponentFields
                schema={schema}
                data={data}
                onFieldChange={(fieldName, value) =>
                  core.setField(entity.id, key, fieldName, value)
                }
                onBeginEdit={() => core.beginTransaction()}
                onCommitEdit={() => core.commitTransaction()}
              />
            )}
          </ComponentSection>
        )
      })}
      <AddComponentControl entity={entity} onAdd={handleAdd} />
    </div>
  )
}

function isRequiredByPeer(entity: Entity, key: string): boolean {
  for (const otherKey of Object.keys(entity.components)) {
    if (otherKey === key) continue
    const other = REGISTRY[otherKey]
    if (other?.requires?.includes(key)) return true
  }
  return false
}

function requirementsMet(schema: ComponentSchema<unknown>, entity: Entity): boolean {
  for (const req of schema.requires ?? []) {
    if (!(req in entity.components)) return false
  }
  return true
}

interface AddComponentControlProps {
  entity: Entity
  onAdd: (key: string) => void
}

function AddComponentControl({ entity, onAdd }: AddComponentControlProps) {
  const eligible = Object.values(REGISTRY).filter(s => !(s.key in entity.components))
  if (eligible.length === 0) return null
  return (
    <div className="add-component">
      <select
        value=""
        onChange={e => {
          const key = e.currentTarget.value
          e.currentTarget.value = ''
          if (key) onAdd(key)
        }}
      >
        <option value="" disabled>Add Component…</option>
        {eligible.map(s => (
          <option key={s.key} value={s.key} disabled={!requirementsMet(s, entity)}>
            {s.label}
            {s.requires && s.requires.length > 0 && !requirementsMet(s, entity)
              ? ` (needs ${s.requires.join(', ')})`
              : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

interface ComponentSectionProps {
  title: string
  children: React.ReactNode
  onRemove?: () => void
  removeDisabled?: boolean
  removeTitle?: string
}

function ComponentSection({ title, children, onRemove, removeDisabled, removeTitle }: ComponentSectionProps) {
  return (
    <section className="property-panel-section">
      <header className="property-panel-section-header">
        <h2>{title}</h2>
        {onRemove && (
          <button
            type="button"
            className="remove-component"
            onClick={onRemove}
            disabled={removeDisabled}
            title={removeTitle}
          >
            Remove
          </button>
        )}
      </header>
      {children}
    </section>
  )
}

interface ComponentFieldsProps {
  schema: ComponentSchema<unknown>
  data: unknown
  onFieldChange: (fieldName: string, value: unknown) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}

function ComponentFields({ schema, data, onFieldChange, onBeginEdit, onCommitEdit }: ComponentFieldsProps) {
  const record = isRecord(data) ? data : {}
  return (
    <>
      {schema.fields.map(field => {
        const raw = record[field.name]
        return (
          <FieldInput
            key={field.name}
            field={field}
            value={raw}
            onChange={next => onFieldChange(field.name, next)}
            onBeginEdit={onBeginEdit}
            onCommitEdit={onCommitEdit}
          />
        )
      })}
    </>
  )
}

interface FieldInputProps {
  field: FieldSchema
  value: unknown
  onChange: (value: unknown) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}

function FieldInput({ field, value, onChange, onBeginEdit, onCommitEdit }: FieldInputProps) {
  if (field.kind.kind === 'bool') {
    return <BoolFieldInput field={field} value={value} onChange={onChange} onBeginEdit={onBeginEdit} onCommitEdit={onCommitEdit} />
  }
  if (field.kind.kind === 'enum') {
    return <EnumFieldInput field={field} options={field.kind.options} value={value} onChange={onChange} onBeginEdit={onBeginEdit} onCommitEdit={onCommitEdit} />
  }
  return <NumberFieldInput field={field} value={value} onChange={onChange} onBeginEdit={onBeginEdit} onCommitEdit={onCommitEdit} />
}

function NumberFieldInput({ field, value, onChange, onBeginEdit, onCommitEdit }: FieldInputProps) {
  const inputId = `field-${field.name}`
  const isInt = field.kind.kind === 'int'
  const snapsToPow2 = field.kind.kind === 'int' && field.kind.snap === 'pow2'
  const numericValue = typeof value === 'number' ? value : 0
  const [text, setText] = useState(() => formatNumber(numericValue))
  const focusedRef = useRef(false)

  // Sync external value → text only when the input isn't being edited.
  // Without this guard, dragging a rect would clobber an in-progress entry
  // like "1." back to "1", making decimals impossible to type.
  useEffect(() => {
    if (!focusedRef.current) setText(formatNumber(numericValue))
  }, [numericValue])

  return (
    <div className="field">
      <label htmlFor={inputId}>{field.label}</label>
      <input
        id={inputId}
        type="number"
        step={isInt ? 1 : 'any'}
        value={text}
        onFocus={() => {
          focusedRef.current = true
          onBeginEdit()
        }}
        onBlur={() => {
          focusedRef.current = false
          const parsed = isInt ? Number.parseInt(text, 10) : Number.parseFloat(text)
          if (Number.isFinite(parsed)) {
            // Hard-snap power-of-two sizes on commit (e.g. typing 30 settles to 32).
            const next = snapsToPow2 ? snapToPowerOfTwo(parsed) : parsed
            if (next !== numericValue) onChange(next)
            setText(formatNumber(next))
          } else {
            setText(formatNumber(numericValue))
          }
          onCommitEdit()
        }}
        onChange={e => {
          const raw = e.currentTarget.value
          setText(raw)
          // Skip commits for in-progress edits: empty, lone sign, trailing dot.
          if (raw === '' || raw === '-' || raw.endsWith('.')) return
          const parsed = isInt ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </div>
  )
}

function BoolFieldInput({ field, value, onChange, onBeginEdit, onCommitEdit }: FieldInputProps) {
  const inputId = `field-${field.name}`
  return (
    <div className="field">
      <label htmlFor={inputId}>{field.label}</label>
      <input
        id={inputId}
        type="checkbox"
        checked={!!value}
        onFocus={onBeginEdit}
        onBlur={onCommitEdit}
        onChange={e => onChange(e.currentTarget.checked)}
      />
    </div>
  )
}

interface EnumFieldInputProps extends FieldInputProps {
  options: readonly { value: number; label: string }[]
}

function EnumFieldInput({ field, options, value, onChange, onBeginEdit, onCommitEdit }: EnumFieldInputProps) {
  const inputId = `field-${field.name}`
  const numericValue = typeof value === 'number' ? value : options[0]?.value ?? 0
  return (
    <div className="field">
      <label htmlFor={inputId}>{field.label}</label>
      <select
        id={inputId}
        value={numericValue}
        onFocus={onBeginEdit}
        onBlur={onCommitEdit}
        onChange={e => onChange(Number(e.currentTarget.value))}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
