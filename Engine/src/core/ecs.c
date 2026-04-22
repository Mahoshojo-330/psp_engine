
#include <string.h>

#include "ecs.h"

uint32_t entity_count;

Transform_Component transforms[MAX_ENTITIES];
Sprite_Component    sprites[MAX_ENTITIES];
Collider_Component  colliders[MAX_ENTITIES];
Physics_Component   physics[MAX_ENTITIES];
Audio_Component     audio_components[MAX_ENTITIES];

uint32_t component_masks[MAX_ENTITIES];


/*
input: void
output: void

Notes: reset the masks and the entity count
*/
void ECS_Clean(void){
    entity_count = 0;
    memset(component_masks, 0, sizeof(component_masks));
    memset(audio_components, 0, sizeof(audio_components));
}
