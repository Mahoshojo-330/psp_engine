# Physics + Input Implementation Plan

## Overview

Physics and Input are implemented as a pair. Physics comes first structurally (component + system), but Input follows immediately — you can't test physics without something driving velocity. Collision detection is a separate step after both are working.

## Implementation Order

### Step 1: Physics Component + System (no collision) — DONE

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

**Implementation note:** Physics_Component is 16 bytes, not 20 as originally stated. The fields (float vx + float vy + float gravity_magnitude + uint8_t gravity_direction + uint8_t padding[3]) sum to 16. 16 is already 4-byte aligned.

### Step 2: Input System — DONE

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

### Step 3: Collision Detection — NOT STARTED

Separate system from physics. New file `src/systems/collision.c` with `collision_system_update()`.

**Collider flags definition (V1):**
- Bit 0 (`0x01`): `is_solid` — blocks movement, triggers push-apart resolution.
- No trigger logic for V1. Triggers need an event/callback system that doesn't exist yet — detecting overlaps we can't act on is wasted cycles. Additional flag bits (is_trigger, collision layers) added when the systems that consume them exist.

**Detection — brute force O(N²):**
- Iterate all pairs (i, j) where both have `COMP_ACTIVE | COMP_COLLIDER | COMP_TRANSFORM`.
- MAX_ENTITIES=256 → worst case ~32K pair checks, each is 4 float comparisons. Trivially fast on PSP — no spatial partitioning needed.

**AABB computation per entity:**
```
left   = transforms[i].x + colliders[i].offset_x
top    = transforms[i].y + colliders[i].offset_y
right  = left + colliders[i].width
bottom = top  + colliders[i].height
```

**Overlap test:**
```
overlap = (a.left < b.right) && (a.right > b.left) &&
          (a.top < b.bottom) && (a.bottom > b.top)
```

**Resolution — minimum penetration axis (solid vs solid only):**

Only runs when both colliders have `is_solid` (flags & 0x01).

1. Compute overlap on each axis:
   - `overlap_x` = min(a.right, b.right) - max(a.left, b.left)
   - `overlap_y` = min(a.bottom, b.bottom) - max(a.top, b.top)

2. Push apart along the axis with smaller overlap (minimum penetration).

3. Who gets pushed:
   - Has `COMP_PHYSICS` → dynamic (can be pushed)
   - No `COMP_PHYSICS` → static (immovable: floors, walls)
   - Dynamic vs static: push the dynamic entity by full overlap
   - Dynamic vs dynamic: push each by half overlap
   - Static vs static: skip (neither can move)

4. Push direction: away from the other entity's center (determines sign).

5. Zero velocity on collision axis: when a dynamic entity is pushed out of a solid, zero the velocity component on that axis. Prevents gravity from accumulating while standing on a floor — without this, the entity sinks further each frame until push-apart can't keep up.

**Files to modify:**
- `Engine/src/systems/collision.c` — **New.** Full detection + resolution loop.
- `Engine/src/main.c` — Add `collision_system_update()` call between physics and render.
- `Engine/Makefile` — Add `collision.o` to the build.
- `Pipeline/TestFiles/test_scene.json` — Fix floor flags: `2` → `1` (was a typo, floor should be solid).

## System Execution Order (main loop)

```
input_system_update();      // read pad, write velocities
physics_system_update();    // apply gravity + velocity to position
collision_system_update();  // AABB detect + resolve
startFrame();
render_system_update();     // draw
endFrame();
```

Input before physics so velocity is set before it's consumed. Physics before collision so positions are updated before overlap checks. Collision before render so final positions are correct before drawing.

## What This Plan Does NOT Include

- **Configurable input mapping from JSON** — deferred. No action/event system exists to map to.
- **Analog stick dead zone tuning** — use a simple threshold constant. Fine-tune later.
- **Physics_Component.max_speed** — not needed until per-entity speed variance exists.
- **Dense ECS arrays** — deferred to post-V1 per existing design decisions.
- **Trigger colliders / overlap events** — no event system to consume them. Add when behaviors exist.
- **Collision layers / masks** — all solid colliders collide with all other solid colliders. Layer filtering is a flags extension for later.
- **Continuous collision detection (CCD)** — at 2px/frame with 32px entities, tunneling isn't possible. Swept AABB can be added if speeds increase dramatically.
- **One-way platforms** — needs a direction flag + special resolution logic. Deferring.

## Open Questions

- **Gravity per-entity vs global:** Current plan is per-entity (set in editor). Alternative: single global gravity value. Per-entity is more flexible (platformer + floating UI elements in same scene) at 5 extra bytes per entity — worth it.
- **Frame-rate dependent movement:** V1 uses pixels/frame (vsync locked to 60fps on PSP). Delta-time can be added later if needed, but vsync lock makes it unnecessary for now.
