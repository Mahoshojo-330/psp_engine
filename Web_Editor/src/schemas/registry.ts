import type { ComponentSchema } from '../core/types'
import { transformSchema } from './transform'

export const REGISTRY: Record<string, ComponentSchema<unknown>> = {
  [transformSchema.key]: transformSchema as ComponentSchema<unknown>,
}
