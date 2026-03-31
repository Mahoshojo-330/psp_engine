# Engine Implementation Status

Last updated: 2026-03-31

## Completed
- [x] **Arena Allocator** (`core/memory.c`) — Init, Alloc, Reset. Sized from `sceKernelTotalFreeMemSize()`.
- [x] **GU Init/Teardown** (`systems/render.c`) — Double-buffered 8888 mode, scissor, depth buffer, boots to blue screen.
- [x] **Component Structs** — `Transform_Component` (16B), `Sprite_Component` (8B), `Collider_Component` (20B) all defined and tightly packed.
- [x] **GPU Structs** — `TextureVertex`, `Texture` in `include/systems/render.h`.
- [x] **Main Loop Skeleton** — Callbacks, arena init, GU init, vsync loop.
- [x] **Makefile** — Compiles main.c, render.c, memory.c with libgu/libgum.

## Not Started (Priority Order)
1. **ECS Core** (`core/ecs.c/.h`) — Entity creation, dense component arrays from arena, component lookup.
2. **Render Loop** — `startFrame()` / `endFrame()` + `render_system_update()` that draws Transform+Sprite entities.
3. **Texture Loading** — Load pre-decoded textures into RAM/VRAM, map to `global_texture_id`.
4. **Binary Scene Format** — Define the blob layout. Write `scene_parser.c` to fread into ECS arrays.
5. **Python Compiler** (`magic_bridge.py`) — JSON → binary blob with asset manifest.
6. **Input System** — `sceCtrlReadBufferPositive()`, map to entity actions.
7. **Physics System** (`systems/physics.c`) — Velocity/gravity on `Physics_Component`, AABB collision on `Collider_Component`.
8. **Audio System** (`systems/audio.c`) — Background music streaming + SFX playback.

## Known Design Decisions Still Open
- **ECS storage strategy:** Dense arrays with entity→index mapping, or simple parallel arrays indexed by entity ID? (Sparse sets / archetypes deferred to post-V1.)
- **Physics_Component struct:** Needs velocity (vx, vy), gravity direction, gravity magnitude. Not yet defined.
- **Audio_Component struct:** Needs sound_id, loop flag, volume. Not yet defined.
- **Texture atlas vs individual textures:** Atlas would save draw calls but adds UV complexity.
- **Scene transition:** Arena_Reset between scenes, or sub-arenas?
