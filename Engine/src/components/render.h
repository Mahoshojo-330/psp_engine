/*
Things to pass to the PSP GPU
WHAT to render
*/
#ifndef COMPONENTS_RENDER_H
#define COMPONENTS_RENDER_H

#include <stdint.h>

typedef struct
{
    float u, v;         // 8 bytes
    uint32_t colour;    // 4 bytes
    float x, y, z;      // 12 bytes
} TextureVertex;

typedef struct
{
    int width, height;
    uint32_t * data;
} Texture;

#endif
