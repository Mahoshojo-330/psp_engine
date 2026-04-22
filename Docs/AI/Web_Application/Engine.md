# Engine Contract for the Web Editor

This document is the authoritative reference for anyone (human or AI) building the **web editor** that produces `scene.json`. It captures everything the editor must know about the engine to export a scene that the runtime can actually load and play. **The editor never talks to C code directly** — it talks to the engine through `scene.json`, which is consumed by [Pipeline/magic_bridge.py](../../../Pipeline/magic_bridge.py) and compiled into a binary blob the engine `fread`s straight into ECS arrays.

If you change a component layout in the engine, this doc, [magic_bridge.py](../../../Pipeline/magic_bridge.py), and [scene_parser.c](../../../Engine/src/loaders/scene_parser.c) must all change together.

---

## 1. Pipeline Overview

```
┌────────────┐    scene.json     ┌──────────────────┐   scene.bin    ┌──────────────┐
│ Web Editor │ ────────────────▶ │ magic_bridge.py  │ ─────────────▶ │  PSP Engine  │
│            │                   │ texture_conv.py  │   tex_*.raw    │  (C, ECS)    │
│            │                   │ audio_conv.py    │   sfx_*.raw    │              │
└────────────┘                   └──────────────────┘                └──────────────┘
       │                                                                     ▲
       └────── source PNG/WAV files passed to converters ────────────────────┘
```

The editor's job is:

1. Let a non-programmer place **entities** with **components** on a 2D canvas.
2. Reference image and audio assets from disk.
3. Export a `scene.json` matching the schema in §6.
4. (Optionally) shell out to the converter scripts to produce the build folder, OR just hand the raw assets to the build step and let the build pipeline handle conversion.

The editor must NOT try to produce `.bin`/`.raw` files itself — those are the Python pipeline's responsibility.

---

## 2. Hardware Constraints the Editor Must Respect

These are PSP hardware limits, not engine choices. The editor should validate before export and surface them as friendly errors.

| Limit               | Value             | Source / Notes                                              |
| ------------------- | ----------------- | ----------------------------------------------------------- |
| Max entities        | **256** per scene | `MAX_ENTITIES` in `ecs.h`. Compiler errors out above this.  |
| Screen resolution   | 480 × 272         | PSP native. World units = pixels.                           |
| Max texture size    | 512 × 512         | Hardware ceiling. Padded to next power-of-2 by converter.   |
| Texture format      | RGBA8888          | 4 bytes/pixel. A 512×512 texture is 1 MB.                   |
| Total RAM budget    | ~24 MB usable     | Shared by code + scene blob + textures + audio.             |
| Audio SFX channels  | 7 simultaneous    | Channel 0 reserved for future BGM.                          |
| Audio sample format | 16-bit PCM, mono  | Stereo SFX gets downmixed in the converter.                 |
| Component bitmask   | 32 bits           | Currently uses 7 bits (see §5). Plenty of headroom.         |

**Rule of thumb to surface in the editor**: total texture footprint ≤ ~8 MB to leave room for code, scene, audio, and stack.

---

## 3. Coordinate System

- Origin `(0, 0)` is the **top-left** of the screen.
- `+X` goes right, `+Y` goes **down** (this is why gravity direction `0` means "down" = `vy += g`).
- Units are **pixels**, stored as `float` for position and `int` for width/height.
- There is no camera yet — `transform.x/y` are screen coordinates directly. The editor canvas should match the 480×272 viewport 1:1 so that "where you put it" is "where it appears".

---

## 4. Entity Model

An **entity** is just an integer index `0..entity_count-1` into a set of parallel arrays. The editor doesn't need to assign IDs — `magic_bridge.py` uses array order. Each entity has:

- A 32-bit **component mask** (auto-built by the compiler from which `components` keys are present).
- A row in each component's parallel array. Rows for components the entity doesn't use are zero-filled but still occupy space — the editor doesn't need to think about this.

Every exported entity automatically gets `COMP_ACTIVE` set. There is no notion of "disabled at export"; if you don't want it in the scene, don't export it.

---

## 5. Component Catalog

This is the complete list of components the engine understands today. Adding a new one requires C work — the editor cannot invent new component types.

### 5.1 `transform` (mask bit 1, 16 bytes)

WHERE the entity is and how big it is.

| Field    | Type  | Notes                                                        |
| -------- | ----- | ------------------------------------------------------------ |
| `x`      | float | Top-left pixel X. Negative is allowed (off-screen).          |
| `y`      | float | Top-left pixel Y.                                            |
| `width`  | int   | Render quad width in pixels.                                 |
| `height` | int   | Render quad height in pixels.                                |

Almost every visible thing has a transform. An entity without transform cannot be rendered, collided, or moved.

### 5.2 `sprite` (mask bit 2, 8 bytes)

WHAT to render. Requires `transform` to actually appear.

| Field               | Type   | Notes                                                                                   |
| ------------------- | ------ | --------------------------------------------------------------------------------------- |
| `global_texture_id` | int    | Index into the texture table. Maps to `tex_{id}.raw` on disk. See §7.                   |
| `colour_tint`       | uint32 | ABGR (PSP order). Multiplied with texture; use `0xFFFFFFFF` for "untinted".             |

If `global_texture_id` references a missing/unloaded texture, the engine renders a **solid-colour rect** using `colour_tint` instead. This is the editor's safety net for "missing asset" — it still looks like something.

### 5.3 `collider` (mask bit 3, 20 bytes)

AABB (axis-aligned bounding box) for collision.

| Field      | Type   | Notes                                                                                |
| ---------- | ------ | ------------------------------------------------------------------------------------ |
| `offset_x` | float  | X offset from `transform.x` (top-left of collider box).                              |
| `offset_y` | float  | Y offset from `transform.y`.                                                         |
| `width`    | float  | Collider width in pixels.                                                            |
| `height`   | float  | Collider height in pixels.                                                           |
| `flags`    | uint32 | Bit field. **Only bit 0 is defined**: `0x01 = is_solid`. All other bits reserved.    |

**Solid means push-apart.** Two entities only physically resolve if BOTH have `is_solid` set. Non-solid colliders can still detect overlap (when overlap detection is wired up later) but won't shove each other.

The editor should default new colliders to "match the sprite's bounds" (offset 0/0, width/height = transform size) and let the user shrink for tighter hitboxes.

### 5.4 `physics` (mask bit 4, 16 bytes)

Velocity + gravity. Requires `transform`. Without it, an entity is static.

| Field                | Type    | Notes                                                                              |
| -------------------- | ------- | ---------------------------------------------------------------------------------- |
| `vx`, `vy`           | float   | Pixels per frame (see §8). Initial velocity at scene start.                        |
| `gravity_magnitude`  | float   | Pixels per frame². 0 = no gravity. A value around 0.3–0.6 feels right at 60 FPS.   |
| `gravity_direction`  | uint8   | `0=down, 1=up, 2=left, 3=right`. Default `0`.                                      |

Anything with physics is "dynamic" for collision purposes (it gets pushed by solid statics, instead of pushing them).

### 5.5 `player_controlled` (mask bit 5, **flag only — no body**)

This is **not a component object** in the JSON — it's a top-level boolean on the entity. The compiler turns it into `COMP_INPUT` in the mask. The engine's input system writes velocity directly into the entity's `physics` component every frame, so an entity with `player_controlled: true` MUST also have `physics`.

There is exactly **one global control scheme** baked into the engine (see §9). The editor does not let users rebind keys, set walk speed, or pick a controller — that's all engine-side hardcoded for V1. Multiple entities can be `player_controlled`; they'll all move together.

### 5.6 `audio` (mask bit 6, 12 bytes)

Per-entity audio playback.

| Field      | Type  | Notes                                                                                  |
| ---------- | ----- | -------------------------------------------------------------------------------------- |
| `sound_id` | int   | Index into the audio table. Maps to `sfx_{id}.raw` on disk. See §7.                    |
| `volume`   | float | 0.0 to 1.0. Default 1.0.                                                               |
| `loop`     | uint8 | 0 = play once, 1 = loop forever.                                                       |

**Important behavior the editor must surface**: every audio entity in the scene **starts playing the moment the scene loads**. The compiler hardcodes `state = 2` (pending) for every audio entity. There is no "trigger this sound when X happens" yet — that's an event/trigger system that doesn't exist (see §12).

So the audio component today is really just "background audio loop" or "intro sting on scene load." If the editor exposes audio at all, label it accordingly: "this sound plays automatically when the scene loads."

### 5.7 Reserved / Bit Map

Component bits, must match `ecs.h`:

```
bit 0 = ACTIVE        (auto, every exported entity)
bit 1 = TRANSFORM
bit 2 = SPRITE
bit 3 = COLLIDER
bit 4 = PHYSICS
bit 5 = INPUT         (from player_controlled flag)
bit 6 = AUDIO
bit 7-31 = reserved
```

The editor should NOT show internal mask values to users — talk in terms of "this entity has a Sprite" not "bit 2 is set."

---

## 6. Scene JSON Schema

This is the exact shape `magic_bridge.py` expects. Keys are lowercase.

```json
{
  "entities": [
    {
      "id": 1,
      "display_name": "Hero",
      "player_controlled": true,
      "components": {
        "transform": { "x": 100, "y": 50, "width": 32, "height": 32 },
        "sprite":    { "global_texture_id": 0, "colour_tint": 4294967295 },
        "collider":  { "offset_x": 0, "offset_y": 0, "width": 32, "height": 32, "flags": 1 },
        "physics":   { "vx": 0, "vy": 0, "gravity_magnitude": 0.5, "gravity_direction": 0 }
      }
    },
    {
      "id": 2,
      "display_name": "Floor",
      "components": {
        "transform": { "x": 0, "y": 250, "width": 480, "height": 22 },
        "sprite":    { "global_texture_id": 1, "colour_tint": 4294967295 },
        "collider":  { "offset_x": 0, "offset_y": 0, "width": 480, "height": 22, "flags": 1 }
      }
    },
    {
      "id": 3,
      "display_name": "Background Music",
      "components": {
        "audio": { "sound_id": 0, "volume": 0.7, "loop": 1 }
      }
    }
  ]
}
```

### Notes for the editor:

- `id` and `display_name` are for the editor's own bookkeeping and UI. The compiler ignores `id` (entity ID = array position) and ignores `display_name` entirely. They don't need to round-trip through the binary.
- `player_controlled` is a top-level bool, NOT inside `components`.
- Every key inside `components` is optional. Omit components an entity doesn't have — the compiler zero-fills them and leaves the mask bit clear.
- `colour_tint` is encoded as a 32-bit unsigned int. `0xFFFFFFFF = 4294967295` is "no tint" (white, full alpha). The editor likely wants a colour picker that converts to ABGR uint32 under the hood.
- Numeric types matter. `transform.width/height` and `gravity_direction` are integers, everything else float-ish. The compiler casts via `int()` / `float()` so values like `"x": 10.0` for width work but lose precision; prefer correct types.

---

## 7. Asset Pipeline & Naming

### Textures

- Source: PNG (any size, RGBA).
- Converter: [`Pipeline/texture_converter.py`](../../../Pipeline/texture_converter.py).
- Output: `tex_{N}.raw` where N matches `sprite.global_texture_id`.
- Format: `[uint32 width][uint32 height][RGBA8888 pixels]`, padded to next power-of-2 (transparent fill).
- Hard limit: padded dimensions ≤ 512 × 512.

The engine loads `tex_0.raw` through `tex_MAX.raw` where MAX = the highest `global_texture_id` referenced by any active sprite. Gaps are silently skipped (entity renders as solid colour). The editor should keep texture IDs **dense from 0** to avoid wasted file slots — when the user adds a sprite, assign the next free ID.

### Audio

- Source: 16-bit PCM WAV.
- Converter: [`Pipeline/audio_converter.py`](../../../Pipeline/audio_converter.py).
- Naming: `sfx_{N}.wav` in the source folder → `sfx_{N}.raw` in the output. The N must match `audio.sound_id`. Files not matching `sfx_N.wav` are skipped with a warning.
- Format: header (`sample_count`, `sample_rate`, `channels`, padding) then int16 samples. Stereo gets downmixed to mono.

Same density rule as textures: pack IDs from 0.

### Build layout the engine expects

```
ms0:/PSP/GAME/PSP_Engine/
├── EBOOT.PBP
└── scenes/
    ├── scene.bin     ← compiled from scene.json
    ├── tex_0.raw
    ├── tex_1.raw
    ├── ...
    ├── sfx_0.raw
    └── sfx_1.raw
```

The path string `"scenes"` is hardcoded in `main.c` today. The editor should not let users change it.

---

## 8. Input (Hardcoded)

There is **no per-entity input config**. The engine's input system iterates every entity with `COMP_INPUT | COMP_PHYSICS` and writes the same velocity to all of them based on a single PSP controller.

| Input                   | Effect                                                   |
| ----------------------- | -------------------------------------------------------- |
| D-pad Left/Right        | `vx -= 2.0` / `vx += 2.0`                                |
| D-pad Up/Down           | `vy -= 2.0` / `vy += 2.0`                                |
| Analog stick            | Adds `(stick / 128) * 2.0` to vx/vy past dead zone (30). |
| Released                | Velocity zeroed (no inertia from input).                 |

Speed is fixed at `PLAYER_SPEED = 2.0` pixels/frame. Jump, attack, dash buttons — none exist yet. The editor should describe the player_controlled toggle as: **"When checked, this entity moves with the D-pad / analog stick at 2 px/frame."**

---

## 9. Physics Behavior

- Runs once per frame, **inside a vsync-locked loop** (~60 Hz on PSP). There is no fixed timestep; one frame = one physics step. Velocities are pixels/frame, gravity is pixels/frame².
- Order each frame: `input → physics → collision → render`.
- Gravity is applied to velocity, then velocity to position. Static entities (no `physics` component) never move.
- **No air resistance, no friction, no max speed.** A falling object accelerates forever until it hits something solid.

For the editor, this means a "feels right" gravity for a 32×32 character is somewhere around **0.3 to 0.6** pixels/frame². The editor can offer a "Test in browser at 60 FPS" preview that approximates this.

---

## 10. Collision Behavior

- AABB only. No circles, no polygons, no rotation.
- Brute-force O(N²) — fine for ≤256 entities.
- Push-apart resolution on the **minimum penetration axis** (whichever overlap is smaller, X or Y).
- Resolution rules:
  - Both must have `is_solid` (flags bit 0). Non-solid pairs are ignored entirely (no overlap callback yet).
  - Static + dynamic: dynamic gets pushed all the way out, its velocity on the resolution axis is zeroed.
  - Dynamic + dynamic: each pushed half the overlap, both velocities zeroed.
  - Static + static: skipped.

The editor should treat `is_solid` as the default for any new collider. Non-solid colliders only become useful once the engine grows trigger/event hooks.

---

## 11. Rendering

- One pass per frame. Iterates entities with `ACTIVE | TRANSFORM | SPRITE`. No z-sorting yet — **draw order is entity order**. Lower entity index draws first (so higher index = "on top"). The editor must preserve user-defined layering by exporting entities in back-to-front order.
- Textured sprites: full UV `[0,0]` to `[w,h]`, modulated by `colour_tint`. No UV offsets, no atlases (yet — atlases are planned as a pipeline-only change later).
- Untextured fallback: solid coloured quad using `colour_tint`. This is what shows up if `global_texture_id` is invalid or the file is missing.
- No text rendering, no UI primitives, no particles, no shaders.

---

## 12. What the Engine Does NOT Do Yet

The editor must not promise these to users — they're not implemented:

- **Scene transitions / multiple scenes.** Only `scenes/scene.bin` is loaded, once, at boot. (See [scene management discussion](../EngineStatus.md) — adding a `SceneTrigger_Component` is the recommended next step.)
- **Events / triggers / scripts.** No "on collision do X", no "on button press play sound", no Lua. Audio plays on scene load, that's it.
- **Spawning / destroying entities at runtime.** The ECS arrays are populated once from the scene blob and never grow.
- **Camera, scrolling, parallax.** World coords = screen coords.
- **Rotation, scaling, flipping sprites.** Quads are axis-aligned and drawn at `transform.width × height`.
- **Animation.** No sprite frames, no timeline.
- **Background music streaming.** Channel 0 is reserved but no streamer exists. Looping a small WAV via the SFX channels works as a stopgap but eats RAM.
- **Save state, settings, dialogue, fonts, particle effects.**

If the editor needs to gate features in its UI, gate on this list.

---

## 13. Editor Validation Checklist

Before allowing export, the editor should verify:

- [ ] Entity count ≤ 256.
- [ ] Every sprite's `global_texture_id` points to an asset the user has loaded.
- [ ] Every audio's `sound_id` points to a loaded WAV.
- [ ] Texture IDs are dense from 0 (no gaps). Same for sound IDs.
- [ ] No PNG would pad past 512×512 (warn the user with the padded size).
- [ ] WAVs are 16-bit PCM (or the editor converts/rejects upstream).
- [ ] Any entity with `player_controlled: true` also has `physics` and `transform`.
- [ ] Any entity with `sprite` also has `transform`.
- [ ] Any entity with `collider` also has `transform`.
- [ ] Any entity with `physics` also has `transform`.
- [ ] Total estimated texture footprint within budget (~8 MB warning threshold).

These are soft contracts — the engine won't crash on most violations, it'll just render nothing or stay silent. But the editor catching them is the difference between "I built a game" and "why is my screen blue."

---

## 14. Sensible Defaults for New Entities

When the user drops a new entity onto the canvas, propose these defaults:

| Component            | Default                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `transform`          | `x, y` = drop point. `width, height` = source PNG size (or 32×32).       |
| `sprite`             | `global_texture_id` = next free ID. `colour_tint` = `0xFFFFFFFF`.        |
| `collider`           | offsets 0, width/height = transform's. `flags` = 1 (solid).              |
| `physics` (optional) | `vx=0, vy=0, gravity_magnitude=0.5, gravity_direction=0`.                |
| `audio` (optional)   | `volume=1.0, loop=0`.                                                    |
| `player_controlled`  | `false`. Toggle on for the hero.                                         |

---

## 15. Where to Look in the Engine for Truth

If anything in this doc seems stale, these source files are authoritative:

- Component bit assignments + array sizes: [Engine/src/core/ecs.h](../../../Engine/src/core/ecs.h)
- Component struct layouts: [Engine/src/components/](../../../Engine/src/components/)
- Binary blob format: [Engine/src/loaders/scene_parser.c](../../../Engine/src/loaders/scene_parser.c) and [Pipeline/magic_bridge.py](../../../Pipeline/magic_bridge.py) (these two MUST agree)
- Asset file formats: [Engine/src/loaders/asset_loader.c](../../../Engine/src/loaders/asset_loader.c)
- Input bindings: [Engine/src/systems/input.c](../../../Engine/src/systems/input.c)
- Physics + collision rules: [Engine/src/systems/physics.c](../../../Engine/src/systems/physics.c), [Engine/src/systems/collision.c](../../../Engine/src/systems/collision.c)
- Audio playback rules: [Engine/src/systems/audio.c](../../../Engine/src/systems/audio.c)

When in doubt, `magic_bridge.py` is the most editor-adjacent ground truth — it is the only thing that consumes the JSON.