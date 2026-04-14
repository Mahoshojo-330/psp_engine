# Engine Implementation Status

Last updated: 2026-04-14

## Completed
- [x] **Arena Allocator** (`core/memory.c`) — Init, Alloc (4-byte aligned), Reset. Sized from `sceKernelTotalFreeMemSize()`.
- [x] **GU Init/Teardown** (`systems/render.c`) — Double-buffered 8888 mode, scissor, depth buffer, boots to blue screen.
- [x] **Component Structs** — `Transform_Component` (16B), `Sprite_Component` (8B), `Collider_Component` (20B) all defined and tightly packed.
- [x] **GPU Structs** — `TextureVertex`, `Texture` in `include/systems/render.h`.
- [x] **Main Loop Skeleton** — Callbacks, arena init, GU init, vsync loop.
- [x] **Makefile** — Compiles main.o, render.o, memory.o, ecs.o, scene_parser.o, asset_loader.o with libgu/libgum.
- [x] **ECS Core** (`core/ecs.c/.h`) — Global parallel arrays indexed by entity ID (MAX_ENTITIES=256), per-entity component bitmask, `ECS_Clean()`. Component type enum is the contract between engine and pipeline.
- [x] **Binary Scene Format** — Defined. Layout: `[uint32 entity_count][uint32 masks[N]][Transform[N]][Sprite[N]][Collider[N]]`, all little-endian. Every entity gets a slot in every component array; mask determines validity.
- [x] **Python Compiler** (`Pipeline/magic_bridge.py`) — JSON → binary blob. Reads scene.json, packs component data matching C struct layouts, outputs blob ready for fread.
- [x] **Scene Parser** (`loaders/scene_parser.c`) — `load_scene(arena, path)` reads binary file into arena, `parse_scene(bytes)` memcpys blob into ECS globals (masks, transforms, sprites, colliders) and sets `entity_count`.
- [x] **Render Loop** (`systems/render.c`) — `startFrame()`/`endFrame()` bracket each frame, `render_system_update()` iterates ACTIVE+TRANSFORM+SPRITE entities. Draws textured sprites via `TextureVertex` when texture exists, falls back to solid-colour `ColourVertex` rects when no texture loaded.
- [x] **Texture Loading** (`loaders/asset_loader.c`) — Individual `.raw` files (V1, not atlas). `load_texture(arena, path, id)` reads `[uint32 w][uint32 h][RGBA8888 pixels]` into arena. `load_scene_textures(arena, base_path)` scans ECS sprites for referenced texture IDs, loads `tex_0.raw`..`tex_N.raw`. Textures live in main RAM (PSP GU DMAs transparently). Pipeline: `texture_converter.py` converts PNGs to `.raw` with power-of-2 padding.

## Not Started (Priority Order)
1. **Input System** — `sceCtrlReadBufferPositive()`, query entities with `COMP_INPUT | COMP_TRANSFORM`.
2. **Physics System** (`systems/physics.c`) — Velocity/gravity on `Physics_Component`, AABB collision on `Collider_Component`. `physics.h` stub exists (comments only, no struct).
3. **Audio System** (`systems/audio.c`) — Background music streaming + SFX playback. `audio.h` stub exists (comments only, no struct).

## Design Decisions Resolved
- **ECS storage:** Parallel arrays indexed by entity ID with global allocation (not arena). Arena is reserved for scene-transient data (textures, etc.). Dense arrays deferred to post-V1.
- **Component masks:** Per-entity `uint32_t` bitmask. Bits defined via enum in `ecs.h`. Game-logic flags (is_solid, etc.) stay inside their respective component structs; mask is purely "which components exist + is_active."
- **COMP_INPUT:** Zero-size component (mask bit only, no struct). Replaces the old `is_being_controlled` flag. `player_controlled.h` exists but is empty (comment questioning whether it's needed or should merge into collider).
- **Scene transition:** `ECS_Clean()` zeroes entity_count + masks. Arena_Reset for transient scene data.

## Known Design Decisions Still Open
- **Physics_Component struct:** Needs velocity (vx, vy), gravity direction, gravity magnitude. Not yet defined.
- **Audio_Component struct:** Needs sound_id, loop flag, volume. Not yet defined.
- **Atlas upgrade (post-V1):** Currently individual textures with per-entity texture bind. Atlas would reduce binds to one per frame — purely a pipeline change (packing + UV rect table), ~20 lines of render code difference. Worth doing when sprite count grows.

## Design Decisions Resolved (Texture Loading)
- **Individual textures for V1, atlas later.** One `.raw` file per texture ID. Simpler to debug, atlas is a pipeline-only upgrade later.
- **Pre-decoded `.raw` format:** Pipeline converts PNGs to raw RGBA8888 pixels with a small header (`[uint32 width][uint32 height][pixels...]`). Power-of-2 padded. No image decoding on PSP.
- **`global_texture_id` in Sprite_Component** indexes into `textures[]` table. Engine loads `tex_{id}.raw` files by convention.
- **Textures in main RAM:** ~700KB VRAM remaining after framebuffers. Textures stay in main RAM; PSP GU DMAs transparently. Fine for 2D.
- **Pipeline tool:** `texture_converter.py` — converts PNGs to `.raw` (single file or batch directory mode).
