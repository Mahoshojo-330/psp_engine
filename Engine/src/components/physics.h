/*
Physics Component — velocity + per-entity gravity

Binary layout (16 bytes, 4-byte aligned):
    float vx               4 bytes
    float vy               4 bytes
    float gravity_magnitude 4 bytes
    uint8_t gravity_direction 1 byte  (0=down, 1=up, 2=left, 3=right)
    uint8_t padding[3]     3 bytes

Note: The plan doc says 20 bytes but the fields only sum to 16.
16 is already 4-byte aligned — no extra padding needed.
*/

#ifndef COMPONENTS_PHYSICS_H
#define COMPONENTS_PHYSICS_H

#include <stdint.h>

// 16 bytes
typedef struct {
    float vx, vy;
    float gravity_magnitude;
    uint8_t gravity_direction;  // 0=down, 1=up, 2=left, 3=right
    uint8_t padding[3];
} Physics_Component;

#endif
