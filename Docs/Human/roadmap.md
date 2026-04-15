# Roadmap - Written by Claude

## M1 — Minimum Viable Product
Get a static scene rendering on real PSP hardware from editor-authored data.

### Engine
- [x] ECS core (entity IDs, parallel arrays indexed by entity ID, component bitmasks)
- [ ] Scene parser (fread binary blob into ECS arrays)
- [ ] Render loop (iterate Transform + Sprite arrays, draw textured quads)
- [ ] Texture loading (pre-decoded images into RAM/VRAM, mapped by integer ID)
- [ ] Input system (d-pad / buttons via sceCtrlReadBufferPositive)

### Pipeline
- [x] Define binary scene format (entity_count + masks + component arrays, LE)
- [x] Python compiler: JSON → binary blob (magic_bridge.py)
- [ ] Asset pipeline: PNG → pre-swizzled raw texture data

### Editor
- [ ] Basic web UI to place 2D objects on a canvas
- [ ] Export scene.json with entities and components

### M1 Result
User places sprites in editor → exports → runs Python compiler → loads EBOOT.PBP on PSP → sees their scene rendered at 30fps with d-pad camera movement.

---

## M2 — Interactivity
Make things move and collide.

- [ ] Physics component (vx, vy, gravity magnitude + direction per entity)
- [ ] Physics system (apply gravity to velocity, velocity to position each frame)
- [ ] Input system (read controller once per frame, write velocity to entities with COMP_INPUT)
- [ ] Pipeline update (pack physics data into binary blob after colliders)
- [ ] Scene parser update (load physics array from blob)
- [ ] Collision detection (AABB on Collider_Component, separate step after physics+input work)
- [ ] Basic audio (background music streaming + SFX)

### M2 Result
A playable character walks around, collides with walls, and there's music.

---

## M3 — Game Logic
Let users define behavior without writing code.

- [ ] Event/trigger system (on_collide, on_interact, on_enter_area)
- [ ] Dialogue system
- [ ] Scene transitions (arena reset + load new blob)
- [ ] Layer/depth sorting for render order

### M3 Result
Users can build a simple adventure/platformer with multiple rooms, dialogue, and interactions.

---

## Stretch Goals (Post V1.0)
- Code stripping / custom recompiling per-game to save RAM
- User-written logic in C or embedded Lua
- Variable timestep physics
- Texture atlas packing in the pipeline
- Function-calling AI model integration for game logic authoring
