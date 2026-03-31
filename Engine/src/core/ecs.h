/*
ECS Core Header

Defines:
    - MAX_ENTITIES cap
    - Component type bitmask enum
    - Extern declarations for component arrays + masks
    - ECS function prototypes

This file is the single source of truth for component type bits.
magic_bridge.py must match these bit assignments exactly.
*/

#ifndef CORE_ECS_H
#define CORE_ECS_H

#include <stdint.h>

// only include the following for now..
#include "../components/transform.h"
#include "../components/sprite.h"
#include "../components/collider.h"

#define MAX_ENTITIES 256


/* Component type bits - the contract between engine and pipeline */
enum {
    COMP_ACTIVE     = 1 << 0,
    COMP_TRANSFORM  = 1 << 1,
    COMP_SPRITE     = 1 << 2,
    COMP_COLLIDER   = 1 << 3,
    COMP_PHYSICS    = 1 << 4,   /* M2 */
    COMP_INPUT      = 1 << 5,
    /* COMP_AUDIO   = 1 << 6,      M2 */
};


extern uint32_t entity_count;
extern uint32_t component_masks[MAX_ENTITIES];

extern Transform_Component transforms[MAX_ENTITIES];
extern Sprite_Component    sprites[MAX_ENTITIES];
extern Collider_Component  colliders[MAX_ENTITIES];


/*
input: void
output: void

Notes: zero entity count and all masks. Call on scene transition.
*/
void ECS_Clean(void);

#endif
