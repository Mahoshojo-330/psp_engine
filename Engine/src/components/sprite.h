/*
Everything related to the actual DISPLAY
WHAT to render
*/

#ifndef COMPONENTS_SPRITE_H
#define COMPONENTS_SPRITE_H

#include <stdint.h>

typedef struct{
    int global_texture_id;
    uint32_t colour_tint;
} Sprite_Component;

#endif