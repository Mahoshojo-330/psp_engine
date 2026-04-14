/*
Asset Loader — loads pre-decoded .raw texture files into a global texture table.

.raw file format (little-endian):
    [uint32 width]      power-of-2
    [uint32 height]     power-of-2
    [RGBA8888 pixels]   width * height * 4 bytes

Textures live in main RAM (not VRAM). PSP GU DMAs from main RAM transparently.
global_texture_id in Sprite_Component indexes into the textures[] table.
*/

#ifndef LOADERS_ASSET_LOADER_H
#define LOADERS_ASSET_LOADER_H

#include <stdint.h>
#include "../core/memory.h"
#include "../../include/systems/render.h"

#define MAX_TEXTURES 64

extern Texture textures[MAX_TEXTURES];
extern uint32_t texture_count;

/*
Load a single .raw file into textures[texture_id].
Pixel data is allocated from the arena.
Returns 0 on success, -1 on failure.
*/
int load_texture(Arena* arena, const char* path, uint32_t texture_id);

/*
Scan ECS sprites array, find all referenced texture IDs,
and load tex_0.raw, tex_1.raw, ... from base_path.
Call after parse_scene().
*/
void load_scene_textures(Arena* arena, const char* base_path);

#endif
