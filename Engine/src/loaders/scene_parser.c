/*
1. Read the binary file into arena
2. Write into ECS arrs

Binary format (all little-endian, matches PSP MIPS LE):
    [uint32  entity_count]                  4
    [uint32  masks[entity_count]]           4 * n
    [Transform_Component[entity_count]]     16 * n  bytes : float x, float y, int width, int height
    [Sprite_Component[entity_count]]        8 * n   bytes : int global_texture_id, uint32 colour_tint
    [Collider_Component[entity_count]]      20 * n  bytes : float offset_x, float offset_y, float width, float height, uint32 flags

Component bit assignments (must match Engine/src/core/ecs.h):
    COMP_ACTIVE    = 1 << 0
    COMP_TRANSFORM = 1 << 1
    COMP_SPRITE    = 1 << 2
    COMP_COLLIDER  = 1 << 3
    COMP_PHYSICS   = 1 << 4
    COMP_INPUT     = 1 << 5

*/

#include "pspiofilemgr.h"
#include "../core/memory.h"
#include "../core/ecs.h"
#include <string.h>


unsigned char* load_scene(Arena* arena, const char* path){
    SceUID fd = sceIoOpen(path, PSP_O_RDONLY, 0);
    if (fd < 0) return NULL;

    SceOff file_size = sceIoLseek(fd, 0, SEEK_END);
    sceIoLseek(fd, 0, SEEK_SET);

    unsigned char* bytes = Arena_Alloc(arena, (size_t)file_size);
    if (!bytes) { sceIoClose(fd); return NULL; }

    sceIoRead(fd, bytes, (SceSize)file_size);
    sceIoClose(fd);
    return bytes;
}


void parse_scene(unsigned char* bytes){
    uint32_t n = *(uint32_t *)&bytes[0];
    entity_count = n;

    memcpy(component_masks, bytes + 4, n * sizeof(uint32_t));
    memcpy(transforms, bytes + (4 * n) + 4,  n * sizeof(Transform_Component));
    memcpy(sprites,    bytes + (20 * n) + 4, n * sizeof(Sprite_Component));
    memcpy(colliders,  bytes + (28 * n) + 4, n * sizeof(Collider_Component));
}