export type EntityId = number

export interface EnumOption {
  value: number
  label: string
}

export type FieldKind =
  | { kind: 'int'; min?: number; max?: number }
  | { kind: 'float'; min?: number; max?: number }
  | { kind: 'bool' }
  | { kind: 'enum'; options: readonly EnumOption[] }

export interface FieldSchema {
  name: string
  label: string
  kind: FieldKind
  default: unknown
  optional?: boolean
}

export interface ComponentSchema<T = unknown> {
  key: string
  label: string
  maskBit: number
  sizeBytes: number
  requires?: string[]
  isFlag?: boolean
  fields: FieldSchema[]
  validate: (data: T) => ValidationIssue[]
  serialize: (data: T) => unknown
  deserialize: (json: unknown) => T
}

export interface ValidationIssue {
  entityId?: EntityId
  componentKey?: string
  fieldName?: string
  message: string
  severity: 'error' | 'warning'
}

export interface Entity {
  id: EntityId
  components: Record<string, unknown>
}

export interface Scene {
  entities: readonly Entity[]
  selectedEntityId: EntityId | null
}

export interface EditorSnapshot extends Scene {
  canUndo: boolean
  canRedo: boolean
}
