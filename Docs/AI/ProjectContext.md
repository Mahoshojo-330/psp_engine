# Project Context: PSP 2D Game Engine

## Goal
Build a 2D game engine for the PlayStation Portable that non-programmers can use. Pre-built "Lego brick" systems — users build games visually in an editor, not by writing code.

## Architecture (V1.0)
Two halves: **Authoring Pipeline** (web editor + Python compiler) and **PSP Engine** (static C binary).

### Data Flow
```
Web Editor → scene.json → Python Compiler → binary blob → PSP Engine (fread into arrays)
```

### Engine Paradigm
- **ECS (Entity-Component-System):** Entities are integer IDs (0 to entity_count-1). Components are global parallel arrays indexed by entity ID (MAX_ENTITIES=256). Per-entity `uint32_t` bitmask tracks which components exist. Systems are C functions that iterate those arrays checking masks.
- **DOD (Data-Oriented Design):** No OOP. Contiguous structs, no pointer chasing. Components contain ONLY packed 32-bit floats/ints.
- **Memory:** Arena allocator for scene-transient data (textures, parsed blobs). ECS arrays are globals (not arena-allocated) — they persist across scene transitions, only their contents are overwritten.
- **Assets:** Individual `.raw` textures (V1). Each file: `[uint32 w][uint32 h][RGBA8888 pixels]`, power-of-2 padded. `global_texture_id` indexes `textures[]` table; engine loads `tex_{id}.raw` by convention. Textures in main RAM (GU DMAs transparently). Pipeline: `texture_converter.py` converts PNGs. Atlas upgrade planned post-V1 as pipeline-only change.

### Directory Layout
```
Engine/
├── src/main.c              # Entry point + game loop
├── src/core/               # memory.c, ecs.c
├── src/systems/            # render.c, physics.c, audio.c
├── src/loaders/            # scene_parser.c, asset_loader.c
├── src/components/         # Pure data structs (transform.h, sprite.h, etc.)
├── include/systems/        # GPU-facing structs (TextureVertex, Texture)
Pipeline/
├── magic_bridge.py         # JSON → binary compiler
├── texture_converter.py    # PNG → .raw texture converter
```

### Naming Collision Rule
- `src/components/` = pure ECS data structs (Transform_Component, Sprite_Component)
- `include/systems/` = hardware-specific struct layouts (TextureVertex for PSP GPU)

## AI Assistant Rules
1. All solutions must fit PSP hardware limits (32MB RAM, MIPS R4000, libgu pipeline).
2. Editor/Pipeline (Web/Python) and Engine (C/PSPSDK) are strictly separate concerns.
3. Challenge the user's approach when a better one exists. Do NOT agree blindly.
4. Do NOT modify `Docs/Human/` unless explicitly told.
5. Do NOT write code unless explicitly told, EXCEPT changes to the `Docs/AI/` folder.
