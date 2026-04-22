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
#define MAX_AUDIO_ASSETS 32

typedef struct {
    int16_t* samples;       /* PCM data (arena-allocated) */
    uint32_t sample_count;  /* total number of samples */
    uint32_t sample_rate;   /* e.g. 22050 */
} Audio_Asset;

extern Texture textures[MAX_TEXTURES];
extern uint32_t texture_count;

extern Audio_Asset audio_assets[MAX_AUDIO_ASSETS];
extern uint32_t audio_asset_count;

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

/*
Load a single .raw audio file into audio_assets[sound_id].
PCM data is allocated from the arena.
Returns 0 on success, -1 on failure.
*/
int load_sfx(Arena* arena, const char* path, uint32_t sound_id);

/*
Scan ECS audio_components array, find all referenced sound IDs,
and load sfx_0.raw, sfx_1.raw, ... from base_path.
Call after parse_scene().
*/
void load_scene_audio(Arena* arena, const char* base_path);

#endif
