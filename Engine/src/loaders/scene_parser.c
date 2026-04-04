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


/*
I have no clue whether this is correct
*/
void load_scene(Arena* arena){
    // read into arena
    SceUID fd = sceIoOpen("path to file", O_RDONLY, 0777); // is the datatype correct? also the path to file, need to change the file name each time? How? 
    unsigned char* bytes = (arena -> buffer) + (arena -> offset);
    int size = sceIoLseek(); // modify this
    int bytes_read = sceIoRead(fd, bytes, 100); 

    (arena -> offset) = Arena_Alloc(arena, bytes_read);
}


/*
parse the data
*/
void parse_scene(Arena* arena, unsigned char* bytes){
    uint32_t n = *(int *)&bytes[0];

    // write masks
    memcpy(component_masks, bytes[4], n * sizeof(uint32_t));

    // write into component lists
    memcpy(transforms, bytes[(4 * n) + 4], n * sizeof(Transform_Component));
    memcpy(sprites, bytes[(20 * n) + 4], n * sizeof(Sprite_Component));
    memcpy(collider, bytes[(28 * n) + 4], n * sizeof(Collider_Component));

}