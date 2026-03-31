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
- **ECS (Entity-Component-System):** Entities are integer IDs. Components are dense, flat data arrays. Systems are C functions that iterate those arrays.
- **DOD (Data-Oriented Design):** No OOP. Contiguous structs, no pointer chasing. Components contain ONLY packed 32-bit floats/ints.
- **Memory:** Single arena allocator. No malloc/free during gameplay.
- **Assets:** Pre-swizzled textures (.raw/.tim2), file paths mapped to integer IDs at compile time. Zero parsing at runtime.

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
