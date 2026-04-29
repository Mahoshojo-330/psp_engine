# Web Editor V1 — Requirements

## Context

Building the first version of a web-based scene editor that produces `scene.json` matching the contract in `Docs/AI/Web_Application/Engine.md`. The editor is one corner of a four-stage pipeline:

```
Web Editor  →  scene.json  →  Pipeline (Python)  →  scene.bin  →  PSP Engine (C)
```

V1 is intentionally minimalist on UX (one canvas, basic property panel, asset browser) but **architecturally complete**: every extension point that V2+ will need (Pipeline shell-out, native filesystem, new components, desktop wrapper) exists as a defined interface, even when the V1 implementation is a browser-only stub. The user's phrase was *"leave the communication socket open"* — this is honoured by making every boundary an explicit interface, never a function call buried inside a component.

The eventual destination is a desktop application (likely Tauri; not decided). V1 is wrapper-agnostic so the choice can be made later without rewriting anything.

See `Architecture.md` for the technical design that satisfies these requirements.

---

## Decisions (locked in this conversation)

| Decision                | Choice                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| Repo location           | New top-level folder: `psp_engine/Web_Editor/`                        |
| Framework + language    | React 19 + TypeScript + Vite                                          |
| Editor canvas surface   | SVG (`viewBox`-based, 480×272 native units)                           |
| Architecture style      | Hexagonal — framework-agnostic Core, swappable UI and IO adapters     |
| Component definition    | Schema-driven registry; one schema file per component                 |
| Asset persistence       | IndexedDB behind an `AssetStore` interface                            |
| Project layout          | Single Vite package with enforced subdir boundaries                   |
| Undo/redo               | **Not in V1** (user choice — flagged below as deferred-with-cost)     |
| Components covered      | All 6 engine components: transform, sprite, collider, physics, audio, plus the `player_controlled` flag |
| Editor features         | Live validation, JSON import + export, real PNG preview, real WAV playback, drag-to-reorder entity list (controls draw order) |

---

## Functional Scope

### Components Covered (V1)

All 6 engine components, mirroring `Engine.md` §5 exactly:

- `transform`
- `sprite`
- `collider`
- `physics`
- `audio`
- `player_controlled` (flag — serializes as a top-level bool, not into `components`)

### Editor Features (V1)

- Live validation (synchronous on every mutation; no debounce).
- JSON import + export of `scene.json` matching `Engine.md` §6.
- Real PNG preview rendered in the SVG canvas with `image-rendering: pixelated`.
- Real WAV playback via Web Audio API on a per-asset Preview button.
- Drag-to-reorder entity list — entity index = draw order (`Engine.md` §11).
- Schema-driven property panel: adding a new component never requires UI edits.

---

## Verification (end-to-end smoke test)

1. **Type-check & lint clean.** `npm run typecheck && npm run lint` exits zero.
2. **Unit tests pass** (Vitest):
   - Each schema's `serialize`/`deserialize` round-trips a representative payload.
   - `validateScene` flags every violation enumerated in Engine.md §13.
   - `EditorCore` mutations notify subscribers exactly once per call.
   - `EditorCore.removeAsset` compacts IDs and rewrites refs (delete `tex_0` while a sprite refs `tex_1` → that sprite now refs `tex_0`).
   - `EditorCore.moveEntity` reorders the entity array and the next `exportJSON()` reflects the new order.
   - **Schema/Engine.md drift check** — `schemas/registry.drift.test.ts` asserts each schema's `(key, maskBit, sizeBytes, ordered field names)` against a hand-typed expected table mirroring Engine.md §5. Any C-side change to a component layout fails this test before it can ship a broken `scene.json`.
3. **Manual editor smoke test in browser:**
   - Build the example scene from Engine.md §6 (Hero + Floor + Background Music) using the editor UI.
   - Upload a real 32×32 PNG; confirm it renders in the canvas at the hero's position with crisp (non-blurred) pixels.
   - Upload a 16-bit PCM WAV; confirm the AssetBrowser preview button plays it. Try a 24-bit WAV; confirm the upload is rejected with a clear message.
   - Try a PNG that would pad past 512×512; confirm the upload is rejected with the predicted padded size in the message.
   - Toggle `player_controlled` **on** while `physics` is absent → live validation badge shows the dependency error. Add `physics`; the error clears immediately (no debounce lag).
   - Drag Floor above Hero in the EntityList → the canvas redraws with Hero rendering on top, proving entity index drives draw order (Engine.md §11).
   - Delete `tex_0` while a sprite still references it → the sprite's texture ref auto-rewrites to the new dense ID range; if no asset is left, the sprite's texture field flags as "unset" in validation.
4. **Cross-pipeline confirmation:**
   - Click Export → save `scene.json` to disk.
   - Run `python3 Pipeline/magic_bridge.py path/to/scene.json` → produces `scene.bin` without errors.
   - Drop `scene.bin` plus the converted `tex_*.raw` / `sfx_*.raw` into `ms0:/PSP/GAME/PSP_Engine/scenes/` (or PPSSPP equivalent) and confirm the engine loads and runs the scene.
5. **Re-import round-trip:**
   - Click Import on the same `scene.json`; confirm the editor reconstructs the identical scene (entity count, components, field values).

---

## What V1 Explicitly Does NOT Have (deferred-by-design)

- **Undo/redo.** User choice; strongly flagged. The retrofit cost is concrete: every mutation on `EditorCore` (`addEntity`, `removeEntity`, `duplicateEntity`, `moveEntity`, `addComponent`, `removeComponent`, `setComponentField`, `addTextureAsset`, `addAudioAsset`, `removeAsset`) becomes a `Command` with `do`/`undo` instead of a direct mutation; `EditorCore` grows a `history` stack and `undo()` / `redo()` methods; every UI test that called the mutation directly now goes through the command bus. That is a multi-day refactor *with* tests to update, vs. ~half a day to wrap mutations in a command pattern from day one. Editors without undo bleed user trust the first time someone fat-fingers a delete; this is the single highest-leverage decision in the plan to reconsider before code starts.
- **Pipeline shell-out (`runPipeline`).** Interface declared, browser implementation throws. Desktop wrapper fills it in.
- **Multi-scene support.** Engine doesn't support it (Engine.md §12).
- **Camera / zoom / pan.** Canvas is fixed 1:1 at 480×272.
- **Sprite atlas, animation, rotation, scaling.** Engine doesn't support them.
- **Texture/audio editing.** Preview only — editor never modifies asset bytes.
- **Texture-format conversion.** That's the Python pipeline's job, not the editor's (Engine.md §1).
