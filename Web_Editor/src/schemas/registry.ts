import type { ComponentSchema } from '../core/types'
import { colliderSchema } from './collider'
import { physicsSchema } from './physics'
import { playerControlledSchema } from './player_controlled'
import { spriteSchema } from './sprite'
import { transformSchema } from './transform'

export const REGISTRY: Record<string, ComponentSchema<unknown>> = {
  [transformSchema.key]:        transformSchema as ComponentSchema<unknown>,
  [spriteSchema.key]:           spriteSchema as ComponentSchema<unknown>,
  [colliderSchema.key]:         colliderSchema as ComponentSchema<unknown>,
  [physicsSchema.key]:          physicsSchema as ComponentSchema<unknown>,
  [playerControlledSchema.key]: playerControlledSchema as ComponentSchema<unknown>,
}
