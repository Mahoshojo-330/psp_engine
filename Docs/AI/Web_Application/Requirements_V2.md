# Web Editor V2 — Requirements

## Context

V1 (V1.1 + V1.5) shipped an editor that owns scene state in a framework-agnostic `EditorCore`, drives a schema-driven property panel, drags rectangles on an SVG canvas, and exports `scene.json` for the one component (`transform`) that landed. The hexagonal boundaries (`core/` ↔ `schemas/` ↔ `io/` ↔ `ui/`) are enforced by ESLint and have already caught violations.

V2 extends that skeleton until the editor can build the full Engine.md §6 example end-to-end (Hero + Floor + Background Music) and round-trip it through `magic_bridge.py` to a running PSP scene. That requires five things V1 deferred:

1. The other five components and four new field kinds.
2. Real assets (PNG textures, WAV audio) persisted across reloads.
3. Validation UI for Engine.md §13.
4. `scene.json` import and disk save/load.
5. Undo/redo — flagged by V1 itself as "the single highest-leverage decision in the plan to reconsider before code starts."

V2 stays browser-only. Pipeline shell-out (`runPipeline`) and the desktop wrapper (Tauri) remain on the V1 deferred list — they are not unlocked by anything in V2 and gain nothing from being co-developed with this work.

---

## Why V2 is split into five slices

The V1.5 doc described V2 as "mostly more files of the same shape." That undersells it. V2 crosses three architectural seams V1 never touched:

- **Undo state** — `EditorCore` grows a history stack and a transaction API. Every mutation method written from V2.0 onwards inherits the discipline; every method written before it is a retrofit.
- **Asset persistence** — first stateful side-effect store outside `EditorCore`, async, persistent (IndexedDB). New error modes: storage-quota, parse failure, asset-not-found-on-load.
- **File IO** — first abstraction over "where does scene.json live." File System Access API in browser, Tauri later. Defines the `IOAdapter` interface so the desktop swap is one file.

Plus two surfaces of "more of the same":
- Five new component schemas + four new field kinds in the panel renderer.
- Validation rules from Engine.md §13.

Bundling all of that into one commit makes a regression a multi-day bisect. V1's review flagged exactly this (`Docs/AI/Web_Application/Review.md` issue 1) when V1.1 + V1.5 landed together. V2 lands as five separately committable slices in dependency order:

| Slice | Doc                  | Adds                                                                              |
| ----- | -------------------- | --------------------------------------------------------------------------------- |
| V2.0  | `Approach/V2_0.md`   | Undo/redo via Scene snapshot history + transaction API + Cmd+Z / Cmd+Shift+Z      |
| V2.1  | `Approach/V2_1.md`   | `collider`, `physics`, `player_controlled` schemas; `bool` + `enum` field kinds; schema/Engine.md drift test |
| V2.2  | `Approach/V2_2.md`   | `sprite`, `audio` schemas; `AssetStore` (IndexedDB); PNG/WAV upload; texture/audio preview; `asset-ref` + `colour-abgr` field kinds |
| V2.3  | `Approach/V2_3.md`   | Live validation engine + inline error rendering + toolbar status badge            |
| V2.4  | `Approach/V2_4.md`   | `jsonToScene` + `IOAdapter` (browser via File System Access API) + Save/Load buttons + drag-to-reorder entity list + `display_name` editing |

Each slice independently passes `npm run typecheck && npm run lint && npm run test`, demos in `npm run dev`, and ships with its own commit.

---

## Decisions (locked in this conversation)

| Decision                                | Choice                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Undo/redo strategy                      | Scene snapshot history (push prior immutable `Scene` per mutation), not Command pattern. The snapshot pattern already exists in `EditorCore`; commands would be a multi-day refactor for no measurable win. |
| Mid-drag / mid-edit coalescing          | Explicit transaction API (`beginTransaction` / `commitTransaction` / `abortTransaction`). Canvas drag wraps drag in one transaction; `<input>` focus opens a transaction, blur commits it. One history entry per "edit session." |
| Asset persistence                       | IndexedDB via `idb` (already in `package.json`). Behind an `AssetStore` interface so a Tauri-backed filesystem implementation can drop in later without touching `core/` or `ui/`. |
| Asset ID density                        | Editor enforces dense-from-0 by auto-compacting on delete. Sprites/audio entities referencing IDs above the deleted one get rewritten in the same `EditorCore.removeAsset` mutation (single history entry). Engine.md §13 demands dense IDs; the alternative — compact at export — splits the truth between editor state and JSON output. |
| Texture rendering on canvas             | `<image>` element inside `<svg>`, `href` set to a blob URL minted by `AssetStore.getBlobURL(id)`. `image-rendering: pixelated`. Falls back to a solid-coloured `<rect>` (using the sprite's `colour_tint`) when the texture is missing — mirrors engine behaviour (Engine.md §5.2). |
| `colour_tint` UI                        | Native `<input type="color">` for RGB; separate alpha slider. Editor stores RGBA internally, serializes to ABGR uint32 at the schema layer. The browser's color picker is good enough; building a custom one is V3 polish. |
| `flags` field on collider               | Modeled in the schema as a single `bool` field (`is_solid`), serialized as `flags: 1` or `flags: 0`. Other bits in `flags` are reserved per Engine.md §5.3, so exposing them now invents UX for engine behaviour that doesn't exist. |
| `player_controlled` shape               | Stored as an empty-body component (`components.player_controlled = {}`); schema declares `isFlag: true`. `sceneToJSON` lifts isFlag schemas to top-level entity booleans. Keeps `EditorCore` and the registry agnostic of "flag vs component"; only `sceneToJSON` and `jsonToScene` know. |
| Validation timing                       | Synchronous, on every `EditorCore` notification. Driven by a pure `validateScene(scene, assets) → ValidationIssue[]` over Engine.md §13 rules. UI subscribes to the same store; no debounce, no separate validation lifecycle. |
| File IO strategy (browser)              | File System Access API where supported (`showSaveFilePicker` / `showOpenFilePicker`). Fallback for Safari/Firefox: `<a download>` for save, `<input type="file">` for load. Both behind the same `IOAdapter.saveScene()` / `loadScene()` interface so the toolbar buttons don't branch on browser. |
| Entity reorder = draw order             | `EditorCore.moveEntity(id, toIndex)` mutates the entity array. Engine.md §11: lower index draws first. Drag handle on `EntityList` rows uses `setPointerCapture`, mirroring Canvas drag. Transactional. |
| `display_name` re-introduced            | Editable inline in `EntityList`. Serialized at top level on each entity; `jsonToScene` reads it back; unchanged on round-trip. V1.5 deferred this — V2.4 closes the loop. |
| Pipeline shell-out                      | Out of scope. Stays on V1's deferred list; gated behind desktop wrapper.            |
| Multi-scene support                     | Out of scope. Engine.md §12 — runtime only loads one scene.                          |
| Camera, zoom, pan, atlas, animation     | Out of scope. Engine doesn't support any of them.                                    |

These decisions are referenced from the slice docs; they don't get re-litigated there.

---

## Functional Scope (cumulative across V2.0–V2.4)

By the end of V2.4 the editor can:

- Build any scene the engine can run today, using all 6 components.
- Persist textures and audio across reloads (IndexedDB).
- Live-validate against every rule in Engine.md §13.
- Save and re-open `scene.json` to/from the user's filesystem.
- Round-trip a scene without lossy reformatting (import → no edits → export ≡ original, modulo float reformatting per V1.5's open question).
- Undo and redo every mutation, including drags, with one history entry per logical edit session.
- Reorder entities to control draw order.
- Edit display names inline.

What it still won't do (deferred to V3 / desktop wrapper):

- Run the Python pipeline. Save still produces `scene.json`; the user runs `magic_bridge.py` themselves.
- Open multiple scenes or switch between them.
- Camera / zoom / pan on the canvas.
- Sprite atlas, animation, rotation, scaling, flipping.
- Texture or audio editing (preview only).
- Test-play in browser (would need a full engine port).

---

## Verification (end-to-end, after V2.4 lands)

This is the V2 acceptance test, run only once all five slices are merged.

1. **All tests green.** `npm run typecheck && npm run lint && npm run test` exits zero. Per-slice unit tests are listed in the slice docs; cumulative count is ~25 specs, none flaky in a 10× run.
2. **Schema/Engine.md drift.** `schemas/registry.drift.test.ts` (introduced in V2.1) asserts every schema's `(key, maskBit, sizeBytes, ordered field names)` against a hand-typed table mirroring Engine.md §5. Any C-side change to a component layout fails this before a broken `scene.json` ships.
3. **Manual end-to-end.** Build the Engine.md §6 scene from scratch in the editor:
   - Create the Hero entity. Upload a 32×32 PNG; assign as Hero's sprite. Add `collider` (matching transform), `physics` (gravity 0.5, direction down), and toggle `player_controlled`. Toolbar status badge reads "Valid."
   - Create the Floor entity at `(0, 250)` size `480 × 22`. Sprite from a second PNG. Solid collider matching transform.
   - Create the Background Music entity with no transform; assign a 16-bit PCM WAV; set loop = 1, volume = 0.7.
   - Drag Hero to `(100, 50)`; observe panel inputs and canvas rect stay in sync.
   - Drag Floor above Hero in the entity list → Hero now renders on top in the canvas (Engine.md §11).
   - Toggle `player_controlled` off on Hero, then off `physics` → live validation flags `player_controlled requires physics`. Restore `physics`; error clears synchronously.
   - Delete the first uploaded texture → Hero's sprite ref auto-rewrites to the now-id-0 texture; Floor's sprite ref shifts down too. No "missing texture" warnings.
   - Press Cmd+Z repeatedly → every mutation undoes in reverse order; Cmd+Shift+Z replays them.
4. **File round-trip.**
   - Click Save → save `scene.json` to disk.
   - Reload the page, click Open, select that file → editor reconstructs the scene byte-identical to before save (entity count, component fields, `display_name`, draw order).
   - Click Save again → diff against the first export is empty (modulo float reformatting if any).
5. **Cross-pipeline confirmation.**
   - Run `python3 Pipeline/magic_bridge.py path/to/scene.json` → produces `scene.bin` without errors.
   - Run `python3 Pipeline/texture_converter.py …` and `audio_converter.py …` against the source PNGs/WAVs → produces `tex_*.raw`, `sfx_*.raw`.
   - Drop everything into `ms0:/PSP/GAME/PSP_Engine/scenes/` (or PPSSPP equivalent); engine loads the scene, Hero responds to D-pad input, Floor catches Hero on fall, music loops.
6. **Storage failure modes.**
   - Open the editor in a private/incognito window where IndexedDB is restricted → asset upload surfaces a clear error in the AssetBrowser; the rest of the editor (entities, schemas, JSON export) still works.
   - Upload a 24-bit WAV → rejected with a message naming the format issue.
   - Upload a PNG that would pad past 512×512 → rejected with the predicted padded size.

If any of these fail at the end of V2, the failing slice owns the regression; the slice docs each restate their own acceptance criteria.

---

## What V2 Explicitly Does NOT Have (deferred-by-design)

- **Pipeline shell-out (`runPipeline`).** Interface still declared, browser implementation still throws. Land with the desktop wrapper.
- **Desktop wrapper.** Tauri or otherwise. V2 is wrapper-agnostic; the wrapper choice is a separate decision against a fully working browser editor.
- **Multi-scene support.** Engine.md §12 — engine only loads one scene at boot.
- **Camera / zoom / pan.** Canvas stays fixed at 480 × 272.
- **Sprite atlas, animation, rotation, scaling, flipping.** Engine doesn't render any of these.
- **Texture / audio editing.** Preview only. The editor never modifies asset bytes.
- **Texture / audio format conversion.** That's `Pipeline/texture_converter.py` and `audio_converter.py`. The editor validates source-file constraints (≤512×512 padded, 16-bit PCM) but does not convert.
- **Test-play in browser.** Would require a JavaScript port of the C engine. Not happening in V2.
- **Multi-select on the canvas, marquee select, snap-to-grid, resize handles.** Polish for V3.
- **Custom keybindings.** Cmd+Z/Cmd+Shift+Z hardcoded in V2.0; configurability is V3.
- **Auto-save / autosave recovery.** `IOAdapter` interface is in place; opportunistic auto-save can plug into V2.4 in V3 without touching `core/`.

---

## Open questions resolved before slice work begins

- **Why undo before components?** Every mutation method added from V2.0 onwards joins the transaction system for free. Adding the five remaining mutation paths (component add/remove, asset add/remove, entity reorder, display-name edit) before undo means each one becomes a retrofit. The cost grows linearly with mutation count; V2.0's order is the cheapest.
- **Why assets before validation?** Several Engine.md §13 rules reference asset state (texture-id density, sound-id density, padded-size limit, format check). Validation with no assets to validate against is half the rule surface. V2.3 lands once the full surface exists.
- **Why import last?** Round-trip is the strictest test of the schema layer. It only earns its keep once the full schema set, asset pipeline, and validation are in place — otherwise import passes trivially because there's nothing to violate.
- **Why is reorder in V2.4 instead of V2.1?** Reorder needs round-trip to be observable. Without import/export back to disk, "draw order is entity index" is only testable through manual canvas inspection. Bundled with V2.4 the test becomes "save, reload, draw order preserved" — concrete and automated.
- **Why no V2.0 for asset compaction unit tests if compaction is core behaviour?** Compaction tests live in V2.2 with the rest of `AssetStore` (the data they operate on doesn't exist before then). V2.0 is purely about history mechanics on the existing mutation surface.

---

## Pointers to slice docs

- [Approach/V2_0.md](Approach/V2_0.md) — Undo/Redo
- [Approach/V2_1.md](Approach/V2_1.md) — Schema-only components + new field kinds + drift test
- [Approach/V2_2.md](Approach/V2_2.md) — Asset pipeline
- [Approach/V2_3.md](Approach/V2_3.md) — Validation UI
- [Approach/V2_4.md](Approach/V2_4.md) — JSON Import + File save/load + entity reorder + display_name
