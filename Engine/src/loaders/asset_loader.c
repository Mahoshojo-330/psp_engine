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
