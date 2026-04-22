/*
Asset Loader — loads .raw texture files into the global texture table.

Each .raw file:
    [uint32 width][uint32 height][RGBA8888 pixels...]

Pixel data is arena-allocated (freed on scene transition via Arena_Reset).
Textures stay in main RAM — PSP GU DMAs from main RAM for rendering.
*/

#include "pspiofilemgr.h"
#include "asset_loader.h"
#include "../core/ecs.h"
#include <stdio.h>
#include <string.h>

Texture textures[MAX_TEXTURES];
uint32_t texture_count = 0;

Audio_Asset audio_assets[MAX_AUDIO_ASSETS];
uint32_t audio_asset_count = 0;


int load_texture(Arena* arena, const char* path, uint32_t texture_id) {
    if (texture_id >= MAX_TEXTURES) return -1;

    SceUID fd = sceIoOpen(path, PSP_O_RDONLY, 0);
    if (fd < 0) return -1;

    /* Read header */
    uint32_t header[2];
    sceIoRead(fd, header, 8);

    uint32_t w = header[0];
    uint32_t h = header[1];
    uint32_t pixel_bytes = w * h * 4;

    /* Allocate pixel buffer from arena */
    uint32_t* pixels = (uint32_t*)Arena_Alloc(arena, pixel_bytes);
    if (!pixels) {
        sceIoClose(fd);
        return -1;
    }

    sceIoRead(fd, pixels, pixel_bytes);
    sceIoClose(fd);

    textures[texture_id].width  = (int)w;
    textures[texture_id].height = (int)h;
    textures[texture_id].data   = pixels;

    if (texture_id >= texture_count)
        texture_count = texture_id + 1;

    return 0;
}


void load_scene_textures(Arena* arena, const char* base_path) {
    /* Zero the table */
    memset(textures, 0, sizeof(textures));
    texture_count = 0;

    /* Find highest texture_id referenced by any active sprite */
    int max_id = -1;
    uint32_t required = COMP_ACTIVE | COMP_SPRITE;

    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & required) != required) continue;
        if (sprites[i].global_texture_id > max_id)
            max_id = sprites[i].global_texture_id;
    }

    if (max_id < 0) return;  /* no sprites need textures */

    /* Load tex_0.raw through tex_N.raw */
    char path[256];
    for (int id = 0; id <= max_id; id++) {
        snprintf(path, sizeof(path), "%s/tex_%d.raw", base_path, id);
        load_texture(arena, path, (uint32_t)id);
        /* Missing files are silently skipped — entity renders as solid colour */
    }
}


/*
Audio .raw format (little-endian):
    [uint32 sample_count]
    [uint32 sample_rate]
    [uint16 channels]       (1=mono — stereo not supported for SFX yet)
    [uint16 padding]
    [int16  pcm_data...]    sample_count * channels * 2 bytes
*/
int load_sfx(Arena* arena, const char* path, uint32_t sound_id) {
    if (sound_id >= MAX_AUDIO_ASSETS) return -1;

    SceUID fd = sceIoOpen(path, PSP_O_RDONLY, 0);
    if (fd < 0) return -1;

    /* Read header: sample_count(4) + sample_rate(4) + channels(2) + padding(2) = 12 bytes */
    uint32_t header32[2];
    uint16_t header16[2];
    sceIoRead(fd, header32, 8);
    sceIoRead(fd, header16, 4);

    uint32_t sample_count = header32[0];
    uint32_t sample_rate  = header32[1];
    uint16_t channels     = header16[0];

    uint32_t pcm_bytes = sample_count * channels * sizeof(int16_t);

    int16_t* samples = (int16_t*)Arena_Alloc(arena, pcm_bytes);
    if (!samples) {
        sceIoClose(fd);
        return -1;
    }

    sceIoRead(fd, samples, pcm_bytes);
    sceIoClose(fd);

    audio_assets[sound_id].samples      = samples;
    audio_assets[sound_id].sample_count = sample_count;
    audio_assets[sound_id].sample_rate  = sample_rate;

    if (sound_id >= audio_asset_count)
        audio_asset_count = sound_id + 1;

    return 0;
}


void load_scene_audio(Arena* arena, const char* base_path) {
    memset(audio_assets, 0, sizeof(audio_assets));
    audio_asset_count = 0;

    int max_id = -1;
    uint32_t required = COMP_ACTIVE | COMP_AUDIO;

    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & required) != required) continue;
        if (audio_components[i].sound_id > max_id)
            max_id = audio_components[i].sound_id;
    }

    if (max_id < 0) return; /* no audio entities */

    char path[256];
    for (int id = 0; id <= max_id; id++) {
        snprintf(path, sizeof(path), "%s/sfx_%d.raw", base_path, id);
        load_sfx(arena, path, (uint32_t)id);
        /* Missing files are silently skipped — entity stays silent */
    }
}
