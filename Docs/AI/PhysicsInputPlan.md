# Physics + Input Implementation Plan

## Overview

Physics and Input are implemented as a pair. Physics comes first structurally (component + system), but Input follows immediately — you can't test physics without something driving velocity. Collision detection is a separate step after both are working.

## Implementation Order

### Step 1: Physics Component + System (no collision)

**Physics_Component struct** (`src/components/physics.h`):
```
float vx, vy;             // velocity (pixels/frame)
float gravity_magnitude;   // gravity strength (set from editor, 0 = no gravity)
uint8_t gravity_direction; // 0=down, 1=up, 2=left, 3=right
uint8_t padding[3];        // align to 20 bytes total
```
Total: 20 bytes. Gravity direction as uint8 enum rather than storing a normalized float2 — 4 possible values, no need for precision.

**ECS integration:**
- Add `#include "../components/physics.h"` to `ecs.h`
- Add `extern Physics_Component physics[MAX_ENTITIES];` to `ecs.h`
- Define the array in `ecs.c`

**Physics system** (`src/systems/physics.c`):
- `physics_system_update()` iterates entities with `COMP_ACTIVE | COMP_PHYSICS | COMP_TRANSFORM`
- Each frame: apply gravity to velocity, apply velocity to position
- No collision resolution in this step — entities fall through each other and off screen

**Pipeline update** (`magic_bridge.py`):
- Add Physics_Component packing after colliders in the binary blob
- Blob layout becomes: `[count][masks][transforms][sprites][colliders][physics]`

**Scene parser update** (`loaders/scene_parser.c`):
- Add memcpy for physics array from blob

### Step 2: Input System

**No Input_Component struct.** `COMP_INPUT` remains a zero-size mask bit (already defined as bit 5 in `ecs.h`). This is correct — there's nothing to configure per-entity about input. The PSP has one controller; the mask just says "this entity responds to it."

**Global input state** (new file `src/systems/input.c`, header `include/systems/input.h` or alongside other system headers):
- Call `sceCtrlSetSamplingCycle(0)` + `sceCtrlSetSamplingMode(PSP_CTRL_MODE_ANALOG)` once at init
- `input_system_update()` calls `sceCtrlReadBufferPositive(&pad, 1)` once per frame
- Stores result in a global `SceCtrlData` (or a simplified struct with `buttons`, `lx`, `ly`)
- Queries entities with `COMP_ACTIVE | COMP_INPUT | COMP_PHYSICS`
- D-pad / analog input writes to `physics[id].vx` and `physics[id].vy`

**Why COMP_PHYSICS is required on input entities:** Input sets velocity. Without a physics component, there's nowhere to write it. The physics system then applies that velocity to transform. This keeps the data flow clean: Input -> velocity -> Physics -> position.

**Movement speed:** Hardcoded constant for V1 (e.g. `#define PLAYER_SPEED 2.0f`). No per-entity speed field. This is the simplest thing that works. When/if a movement-speed-per-entity need arises, it can go into Physics_Component as a `max_speed` field — but don't add it until it's needed.

**Input mapping:** Hardcoded for V1. D-pad/analog = movement, face buttons = TBD (jump, interact — these need an action/event system that doesn't exist yet). Configurable JSON mapping is deferred until there's a behavior system to map inputs TO. Reading all buttons is free (one API call returns everything), but the *mapping layer* has nothing to map to right now.

### Step 3: Collision Detection (separate, after Step 1+2 work)

- `Collider_Component` already exists (offset_x, offset_y, width, height, flags)
- AABB overlap check between entities with `COMP_ACTIVE | COMP_COLLIDER | COMP_TRANSFORM`
- Resolution: push entities apart along smallest overlap axis
- `is_solid` flag in `collider.flags` determines if collision blocks movement or is trigger-only
- This is the complex part of physics — keep it separate from basic velocity/gravity

## System Execution Order (main loop)

```
input_system_update();    // read pad, write velocities
physics_system_update();  // apply gravity + velocity to position, resolve collisions
render_system_update();   // draw
```

Input before physics so velocity is set before it's consumed. Physics before render so positions are final before drawing.

## What This Plan Does NOT Include

- **Configurable input mapping from JSON** — deferred. No action/event system exists to map to. The indirection layer would map to exactly one hardcoded behavior (movement). Build mapping when there are multiple actions to map between.
- **Analog stick dead zone tuning** — use a simple threshold constant. Fine-tune later.
- **Physics_Component.max_speed** — not needed until per-entity speed variance exists in a real game scene.
- **Dense ECS arrays** — deferred to post-V1 per existing design decisions.

## Open Questions

- **Gravity per-entity vs global:** Current plan is per-entity (set in editor). Alternative: single global gravity value. Per-entity is more flexible (platformer + floating UI elements in same scene) at 5 extra bytes per entity — worth it.
- **Frame-rate dependent movement:** V1 uses pixels/frame (vsync locked to 60fps on PSP). Delta-time can be added later if needed, but vsync lock makes it unnecessary for now.
