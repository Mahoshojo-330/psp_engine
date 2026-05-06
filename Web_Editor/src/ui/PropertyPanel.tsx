import { useEffect, useRef, useState } from 'react'
import type { EditorCore } from '../core/EditorCore'
import type { ComponentSchema, FieldSchema } from '../core/types'
import { REGISTRY } from '../schemas/registry'
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

  const componentKeys = Object.keys(entity.components)
  if (componentKeys.length === 0) {
    return (
      <div className="property-panel">
        <p className="property-panel-empty">Entity #{entity.id} has no components</p>
      </div>
    )
  }

  return (
    <div className="property-panel">
      {componentKeys.map(key => {
        const schema = REGISTRY[key]
        if (!schema) {
          return (
            <ComponentSection key={key} title={key}>
              <p className="property-panel-empty">Unknown component: {key}</p>
            </ComponentSection>
          )
        }
        const data = entity.components[key]
        return (
          <ComponentSection key={key} title={schema.label}>
            <ComponentFields
              schema={schema}
              data={data}
              onFieldChange={(fieldName, value) =>
                core.setField(entity.id, key, fieldName, value)
              }
            />
          </ComponentSection>
        )
      })}
    </div>
  )
}

function ComponentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="property-panel-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

interface ComponentFieldsProps {
  schema: ComponentSchema<unknown>
  data: unknown
  onFieldChange: (fieldName: string, value: unknown) => void
}

function ComponentFields({ schema, data, onFieldChange }: ComponentFieldsProps) {
  const record = isRecord(data) ? data : {}
  return (
    <>
      {schema.fields.map(field => {
        const raw = record[field.name]
        const value = typeof raw === 'number' ? raw : 0
        return (
          <FieldInput
            key={field.name}
            field={field}
            value={value}
            onChange={next => onFieldChange(field.name, next)}
          />
        )
      })}
    </>
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
  const [text, setText] = useState(() => formatNumber(value))
  const focusedRef = useRef(false)

  // Sync external value → text only when the input isn't being edited.
  // Without this guard, dragging a rect would clobber an in-progress entry
  // like "1." back to "1", making decimals impossible to type.
  useEffect(() => {
    if (!focusedRef.current) setText(formatNumber(value))
  }, [value])

  return (
    <div className="field">
      <label htmlFor={inputId}>{field.label}</label>
      <input
        id={inputId}
        type="number"
        step={isInt ? 1 : 'any'}
        value={text}
        onFocus={() => { focusedRef.current = true }}
        onBlur={() => {
          focusedRef.current = false
          const parsed = isInt ? Number.parseInt(text, 10) : Number.parseFloat(text)
          if (Number.isFinite(parsed)) {
            if (parsed !== value) onChange(parsed)
            setText(formatNumber(parsed))
          } else {
            setText(formatNumber(value))
          }
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

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
