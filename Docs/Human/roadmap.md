# Roadmap - Written by Claude

## M1 — Minimum Viable Product
Get a static scene rendering on real PSP hardware from editor-authored data.

### Engine
- [ ] ECS core (entity IDs, dense component arrays from arena)
- [ ] Render loop (iterate Transform + Sprite arrays, draw textured quads)
- [ ] Texture loading (pre-decoded images into RAM/VRAM, mapped by integer ID)
- [ ] Scene parser (fread binary blob into ECS arrays)
- [ ] Input system (d-pad / buttons via sceCtrlReadBufferPositive)

### Pipeline
- [ ] Define binary scene format (header + entity table + component data + asset manifest)
- [ ] Python compiler: JSON → binary blob
- [ ] Asset pipeline: PNG → pre-swizzled raw texture data

### Editor
- [ ] Basic web UI to place 2D objects on a canvas
- [ ] Export scene.json with entities and components

### M1 Result
User places sprites in editor → exports → runs Python compiler → loads EBOOT.PBP on PSP → sees their scene rendered at 30fps with d-pad camera movement.

---

## M2 — Interactivity
Make things move and collide.

- [ ] Physics component (velocity, gravity)
- [ ] Physics system (apply velocity, gravity each frame)
- [ ] Collision detection (AABB on Collider_Component)
- [ ] Player controller (map input → movement on a specific entity)
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
