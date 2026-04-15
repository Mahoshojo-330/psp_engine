/*
Collision System — AABB detection + solid push-apart resolution

Brute-force O(N^2) pair check. MAX_ENTITIES=256 -> ~32K checks max,
each is 4 float comparisons. Fine for PSP.

Resolution: minimum penetration axis. Dynamic entities (have COMP_PHYSICS)
get pushed; static entities (no COMP_PHYSICS) are immovable.
*/

#include "../core/ecs.h"

#define COLLISION_MASK (COMP_ACTIVE | COMP_COLLIDER | COMP_TRANSFORM)


static float min_f(float a, float b) { return a < b ? a : b; }
static float max_f(float a, float b) { return a > b ? a : b; }


void collision_system_update(void) {
    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & COLLISION_MASK) != COLLISION_MASK) continue;

        float a_left   = transforms[i].x + colliders[i].offset_x;
        float a_top    = transforms[i].y + colliders[i].offset_y;
        float a_right  = a_left + colliders[i].width;
        float a_bottom = a_top  + colliders[i].height;

        for (uint32_t j = i + 1; j < entity_count; j++) {
            if ((component_masks[j] & COLLISION_MASK) != COLLISION_MASK) continue;

            float b_left   = transforms[j].x + colliders[j].offset_x;
            float b_top    = transforms[j].y + colliders[j].offset_y;
            float b_right  = b_left + colliders[j].width;
            float b_bottom = b_top  + colliders[j].height;

            /* Overlap test */
            if (a_left >= b_right || a_right <= b_left ||
                a_top >= b_bottom || a_bottom <= b_top)
                continue;

            /* Both must be solid for resolution */
            if (!(colliders[i].flags & 0x01) || !(colliders[j].flags & 0x01))
                continue;

            int i_dynamic = (component_masks[i] & COMP_PHYSICS) != 0;
            int j_dynamic = (component_masks[j] & COMP_PHYSICS) != 0;

            /* Static vs static: skip */
            if (!i_dynamic && !j_dynamic) continue;

            /* Penetration on each axis */
            float overlap_x = min_f(a_right, b_right) - max_f(a_left, b_left);
            float overlap_y = min_f(a_bottom, b_bottom) - max_f(a_top, b_top);

            /* Push direction: sign based on center positions */
            float a_cx = (a_left + a_right)  * 0.5f;
            float a_cy = (a_top  + a_bottom) * 0.5f;
            float b_cx = (b_left + b_right)  * 0.5f;
            float b_cy = (b_top  + b_bottom) * 0.5f;

            if (overlap_x < overlap_y) {
                /* Push along X */
                float sign = (a_cx < b_cx) ? -1.0f : 1.0f;

                if (i_dynamic && !j_dynamic) {
                    transforms[i].x += sign * overlap_x;
                    physics[i].vx = 0.0f;
                } else if (!i_dynamic && j_dynamic) {
                    transforms[j].x -= sign * overlap_x;
                    physics[j].vx = 0.0f;
                } else {
                    /* Both dynamic */
                    float half = overlap_x * 0.5f;
                    transforms[i].x += sign * half;
                    transforms[j].x -= sign * half;
                    physics[i].vx = 0.0f;
                    physics[j].vx = 0.0f;
                }
            } else {
                /* Push along Y */
                float sign = (a_cy < b_cy) ? -1.0f : 1.0f;

                if (i_dynamic && !j_dynamic) {
                    transforms[i].y += sign * overlap_y;
                    physics[i].vy = 0.0f;
                } else if (!i_dynamic && j_dynamic) {
                    transforms[j].y -= sign * overlap_y;
                    physics[j].vy = 0.0f;
                } else {
                    /* Both dynamic */
                    float half = overlap_y * 0.5f;
                    transforms[i].y += sign * half;
                    transforms[j].y -= sign * half;
                    physics[i].vy = 0.0f;
                    physics[j].vy = 0.0f;
                }
            }

            /* Recompute AABB for i since it may have moved */
            a_left   = transforms[i].x + colliders[i].offset_x;
            a_top    = transforms[i].y + colliders[i].offset_y;
            a_right  = a_left + colliders[i].width;
            a_bottom = a_top  + colliders[i].height;
        }
    }
}
