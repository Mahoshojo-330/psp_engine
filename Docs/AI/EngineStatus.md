# Engine Implementation Status

Last updated: 2026-03-31

## Completed
- [x] **Arena Allocator** (`core/memory.c`) — Init, Alloc (4-byte aligned), Reset. Sized from `sceKernelTotalFreeMemSize()`.
- [x] **GU Init/Teardown** (`systems/render.c`) — Double-buffered 8888 mode, scissor, depth buffer, boots to blue screen.
- [x] **Component Structs** — `Transform_Component` (16B), `Sprite_Component` (8B), `Collider_Component` (20B) all defined and tightly packed.
- [x] **GPU Structs** — `TextureVertex`, `Texture` in `include/systems/render.h`.
- [x] **Main Loop Skeleton** — Callbacks, arena init, GU init, vsync loop.
- [x] **Makefile** — Compiles main.c, render.c, memory.c with libgu/libgum.
- [x] **ECS Core** (`core/ecs.c/.h`) — Global parallel arrays indexed by entity ID (MAX_ENTITIES=256), per-entity component bitmask, `ECS_Clean()`. Component type enum is the contract between engine and pipeline.
- [x] **Binary Scene Format** — Defined. Layout: `[uint32 entity_count][uint32 masks[N]][Transform[N]][Sprite[N]][Collider[N]]`, all little-endian. Every entity gets a slot in every component array; mask determines validity.
- [x] **Python Compiler** (`Pipeline/magic_bridge.py`) — JSON → binary blob. Reads scene.json, packs component data matching C struct layouts, outputs blob ready for fread.

## Not Started (Priority Order)
1. **Scene Parser** (`loaders/scene_parser.c`) — fread binary blob into ECS arrays. Should be ~5 fread calls.
2. **Render Loop** — `startFrame()` / `endFrame()` + `render_system_update()` that draws Transform+Sprite entities.
3. **Texture Loading** — Load pre-decoded textures into RAM/VRAM, map to `global_texture_id`.
4. **Input System** — `sceCtrlReadBufferPositive()`, query entities with `COMP_INPUT | COMP_TRANSFORM`.
5. **Physics System** (`systems/physics.c`) — Velocity/gravity on `Physics_Component`, AABB collision on `Collider_Component`.
6. **Audio System** (`systems/audio.c`) — Background music streaming + SFX playback.

## Design Decisions Resolved
- **ECS storage:** Parallel arrays indexed by entity ID with global allocation (not arena). Arena is reserved for scene-transient data (textures, etc.). Dense arrays deferred to post-V1.
- **Component masks:** Per-entity `uint32_t` bitmask. Bits defined via enum in `ecs.h`. Game-logic flags (is_solid, etc.) stay inside their respective component structs; mask is purely "which components exist + is_active."
- **COMP_INPUT:** Zero-size component (mask bit only, no struct). Replaces the old `is_being_controlled` flag.
- **Scene transition:** `ECS_Clean()` zeroes entity_count + masks. Arena_Reset for transient scene data.

## Known Design Decisions Still Open
- **Physics_Component struct:** Needs velocity (vx, vy), gravity direction, gravity magnitude. Not yet defined.
- **Audio_Component struct:** Needs sound_id, loop flag, volume. Not yet defined.
- **Texture atlas vs individual textures:** Atlas would save draw calls but adds UV complexity.
- **Asset manifest in blob:** Current blob has no asset manifest — texture loading needs a strategy (baked into blob vs separate file).
