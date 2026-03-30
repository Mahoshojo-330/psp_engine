/*
The flags are in the following order, each takign 1 bit size

1. is_active
2. is_solid
3. is_being_controlled
...

*/

#ifndef COMPONENTS_COLLIDER_H
#define COMPONENTS_COLLIDER_H

#include <stdint.h>

// 20 bytes
typedef struct {
    float offset_x;   // 4 bytes relevance position of x from the left bottom corner of the sprite
    float offset_y;   // 4 bytes relevance position of y
    float width;      // 4 bytes precision width of the collider
    float height;     // 4 bytes precision height of the collider
    uint32_t flags;   // 4 bytes
} Collider_Component; 

#endif