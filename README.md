<div align="center">

# ◆ PSP Engine

### A visual 2D game engine for the PlayStation Portable

*Design your game in the browser. Compile it to native PSP. No code required.*

<br/>

![C](https://img.shields.io/badge/Engine-C%20%2F%20PSPSDK-A8B9CC?style=for-the-badge&logo=c&logoColor=white)
![Python](https://img.shields.io/badge/Pipeline-Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/Editor-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

![Status](https://img.shields.io/badge/status-actively%20building-success?style=flat-square)
![Platform](https://img.shields.io/badge/target-PSP%20(MIPS%20R4000,%2032MB)-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

---

## What is this?

**PSP Engine** is a 2D game engine built around a simple idea: *you shouldn't have to
write C to make a game for the PlayStation Portable.*

You lay out your scene visually in a web editor — drop in sprites, give them physics,
add colliders and sound. The editor exports a plain `scene.json`. A Python pipeline
compiles that into a tightly-packed binary blob and converts your art and audio into
raw, PSP-ready assets. The C engine then `fread`s the blob straight into memory and
runs your game on real hardware.

Three small, sharply-separated pieces, one clean contract between them.

> This is my first personal project — a full vertical slice from a browser UI all the
> way down to the metal of a 2005 handheld. 💜

---

## How it works

The whole system is one data pipeline. Each stage does one job and hands off a
well-defined artifact to the next.

```
   ┌──────────────────┐        ┌───────────────────┐        ┌──────────────────┐
   │   WEB EDITOR     │        │     PIPELINE      │        │   PSP ENGINE     │
   │   (React + TS)   │        │     (Python)      │        │   (C / PSPSDK)   │
   │                  │        │                   │        │                  │
   │  Place entities  │ scene  │  magic_bridge.py  │ binary │  scene_parser    │
   │  Edit components │ .json  │  texture_conv.py  │ blob + │  ECS arrays      │
   │  Manage assets   │ ─────► │  audio_conv.py    │ .raw   │  systems run @   │
   │  Export JSON     │  PNG   │                   │ ─────► │  vsync, on metal │
   │                  │  WAV   │  JSON → .bin      │ assets │                  │
   └──────────────────┘        │  PNG  → .raw      │        └──────────────────┘
                               │  WAV  → .raw PCM  │              EBOOT.PBP
                               └───────────────────┘
```

Why a binary blob? The PSP is a MIPS R4000 with 32 MB of RAM. Parsing JSON on-device
would be slow and wasteful, so all of that work happens ahead of time on your desktop.
The engine just reads a memory image of its ECS arrays directly off the Memory Stick —
no decoding, no allocation churn, no surprises.

---

## Repository layout

```
psp_engine/
├── Web_Editor/        # React 19 + TypeScript visual scene editor (Vite)
│   └── src/
│       ├── core/          # EditorCore — scene state, undo/redo, snapshots
│       ├── schemas/       # Component schemas (single source of truth)
│       ├── ui/            # Canvas, entity list, property panel, presets
│       ├── assets/        # Asset store + IndexedDB persistence
│       └── io/            # File System Access save/load + serialization
│
├── Pipeline/          # Python compilers (the "magic bridge")
│   ├── magic_bridge.py     # scene.json  → binary blob
│   ├── texture_converter.py# .png        → .raw  (RGBA8888, pow-2 padded)
│   ├── audio_converter.py  # .wav        → .raw  (mono PCM)
│   └── TestFiles/          # Sample scene + assets + build_test.sh
│
├── Engine/            # The PSP runtime, written in C against the PSPSDK
│   ├── src/
│   │   ├── core/          # Arena allocator + ECS (parallel arrays, bitmasks)
│   │   ├── systems/       # render · physics · collision · input · audio
│   │   ├── loaders/       # scene_parser · asset_loader
│   │   └── components/    # Pure data structs (transform, sprite, ...)
│   └── Makefile
│
└── Docs/              # Design docs, architecture notes, engine status
```

---

## Features

### 🎨 The Editor

- **Visual canvas** — draw and drag entities; the layout *is* the scene.
- **Component-driven** — every entity is composed from data components (Transform,
  Sprite, Collider, Physics, Player Control, Audio), exactly mirroring the engine's ECS.
- **Entity presets** — start from sensible templates instead of a blank slate.
- **Full undo / redo** with keyboard shortcuts.
- **Asset management** — import textures, persisted locally via IndexedDB.
- **Live JSON view** — see the exact `scene.json` you're about to export.
- **Schema-validated** — a drift test guards the editor's schemas against the engine
  contract so the two halves can't silently fall out of sync.
- **21 test files** covering the core, schemas, serialization, and UI logic.

### ⚙️ The Pipeline

- **`magic_bridge.py`** — packs `scene.json` into a little-endian binary blob whose
  layout byte-for-byte matches the engine's C structs.
- **`texture_converter.py`** — converts PNGs to raw `RGBA8888`, padded to power-of-2
  dimensions (single-file or batch mode).
- **`audio_converter.py`** — converts WAVs to raw mono PCM for hardware playback.
- **`build_test.sh`** — one command to compile the sample scene end-to-end.

### 🕹️ The Engine

- **ECS + Data-Oriented Design** — entities are integer IDs, components are contiguous
  parallel arrays, a per-entity bitmask says what each entity *is*. No OOP, no pointer
  chasing.
- **Arena allocator** — one big linear block, bump-pointer allocation. No `malloc`
  churn at runtime.
- **Render system** — double-buffered 8888 mode via `libgu`/`libgum`; draws textured
  sprites, falls back to solid-colour rects.
- **Physics** — per-entity velocity + configurable gravity, applied every frame.
- **Collision** — AABB overlap detection with minimum-penetration push-apart;
  dynamic entities get pushed, static ones stay put.
- **Input** — reads the controller once per frame, drives `player_controlled` entities.
- **Audio (SFX)** — non-blocking playback across hardware channels, with per-entity
  volume and looping.

---

## Getting started

### 1 · Run the editor

```bash
cd Web_Editor
npm install
npm run dev          # http://localhost:5173
```

Other scripts: `npm run build` · `npm run test` · `npm run lint` · `npm run typecheck`

### 2 · Compile a scene

The pipeline needs **Python 3** and **Pillow** (`pip install Pillow`).

```bash
# Compile a single scene + its assets
python3 Pipeline/magic_bridge.py      scene.json        scene.bin
python3 Pipeline/texture_converter.py sprites/          out/
python3 Pipeline/audio_converter.py   sounds/           out/
```

Or run the full sample build in one shot:

```bash
cd Pipeline/TestFiles
./build_test.sh      # compiles test_scene.json → Engine/build/scenes/
```

### 3 · Build for the PSP

Requires the [PSPSDK](https://pspdev.github.io/) toolchain on your `PATH`.

```bash
cd Engine
make                 # produces EBOOT.PBP
```

Copy `EBOOT.PBP` and the `scenes/` folder to your Memory Stick (or load it in a PSP
emulator such as PPSSPP), and your scene runs on hardware.

---

## The component model

The bitmask below is the contract shared by all three layers — the editor emits it,
the pipeline packs it, the engine reads it. They must agree, and a test keeps them honest.

| Bit | Component   | What it gives an entity                                   |
|----:|-------------|-----------------------------------------------------------|
| `0` | `ACTIVE`    | The entity exists and is processed this frame.            |
| `1` | `TRANSFORM` | Position and size (`x, y, width, height`).                |
| `2` | `SPRITE`    | A texture to draw, plus a colour tint.                    |
| `3` | `COLLIDER`  | An AABB for collision, with a `is_solid` flag.            |
| `4` | `PHYSICS`   | Velocity and per-entity gravity.                          |
| `5` | `INPUT`     | Responds to the controller (zero-size marker component).  |
| `6` | `AUDIO`     | Plays a sound — looping or one-shot, with volume.         |

---

## Roadmap

**Done**
- [x] ECS core, arena allocator, binary scene format
- [x] Render, physics, collision, input, and SFX audio systems
- [x] Full Python pipeline (scene + texture + audio compilers)
- [x] Visual web editor (V1 complete, V2 in progress)

**Next**
- [ ] BGM streaming (OGG Vorbis on a dedicated kernel thread)
- [ ] Texture atlas to cut per-sprite GPU binds
- [ ] Spatial-grid collision (replace the O(N²) broad phase)
- [ ] Event / trigger system, scene transitions, layer sorting
- [ ] Runtime spawn / destroy, camera, animation

---

## Tech stack

| Layer    | Built with                                                       |
|----------|------------------------------------------------------------------|
| Editor   | React 19 · TypeScript · Vite · Vitest · IndexedDB (`idb`)        |
| Pipeline | Python 3 · Pillow · `struct`                                     |
| Engine   | C · PSPSDK · `libgu` / `libgum` · `libpspaudio`                  |

---

## License

Released under the [MIT License](LICENSE)

---

<div align="center">

*Built with care* ◆

</div>
