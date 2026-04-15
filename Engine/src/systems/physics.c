#include "../core/ecs.h"

#define PHYSICS_MASK (COMP_ACTIVE | COMP_PHYSICS | COMP_TRANSFORM)

void physics_system_update(void) {
    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & PHYSICS_MASK) != PHYSICS_MASK) continue;

        /* Apply gravity to velocity */
        float grav = physics[i].gravity_magnitude;
        if (grav != 0.0f) {
            switch (physics[i].gravity_direction) {
                case 0: physics[i].vy += grav;  break; /* down  (+Y is down on PSP) */
                case 1: physics[i].vy -= grav;  break; /* up    */
                case 2: physics[i].vx -= grav;  break; /* left  */
                case 3: physics[i].vx += grav;  break; /* right */
            }
        }

        /* Apply velocity to position */
        transforms[i].x += physics[i].vx;
        transforms[i].y += physics[i].vy;
    }
}
