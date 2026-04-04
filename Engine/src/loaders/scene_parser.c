/*

1. read the binary file into memory
2. write into ECS arr

Binary format (all little-endian, matches PSP MIPS LE):
    [uint32  entity_count]
    [uint32  masks[entity_count]]
    [Transform_Component[entity_count]]   16 bytes each: float x, float y, int width, int height
    [Sprite_Component[entity_count]]       8 bytes each: int global_texture_id, uint32 colour_tint
    [Collider_Component[entity_count]]    20 bytes each: float offset_x, float offset_y, float width, float height, uint32 flags

Component bit assignments (must match Engine/src/core/ecs.h):
    COMP_ACTIVE    = 1 << 0
    COMP_TRANSFORM = 1 << 1
    COMP_SPRITE    = 1 << 2
    COMP_COLLIDER  = 1 << 3
    COMP_PHYSICS   = 1 << 4
    COMP_INPUT     = 1 << 5

*/

