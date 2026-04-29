# Web Editor V1 — Architecture

This document describes the technical design of the Web Editor V1. For project context, scope, and verification criteria, see `Requirements.md`. For the JSON contract this editor produces, see `Engine.md`.

---

## Architecture: Hexagonal (Core / UI Adapter / IO Adapter)

```
┌──────────────────────────────────────────────────────────────┐
│  UI Adapter (React 19 + TypeScript)                          │  ← swappable in V?
│   ─ App, Toolbar, EntityList, EditorCanvas (SVG),            │
│     PropertyPanel (schema-driven), AssetBrowser              │
│   ─ Subscribes to Core via useSyncExternalStore              │
├──────────────────────────────────────────────────────────────┤
│  Editor Core (pure TypeScript, zero DOM/React imports)       │
│   ─ Scene model (entities, components, asset registry)       │
│   ─ Mutations (add/remove entity, set field, …)              │
│   ─ Validation (per-component, per-entity, scene-level)      │
│   ─ Pub/sub: subscribe(listener) → unsubscribe               │
├──────────────────────────────────────────────────────────────┤
│  Schemas (data-driven component registry)                    │
│   ─ One file per component declares: fields, defaults,       │
│     mask bit, dependencies, validate, serialize, deserialize │
│   ─ UI form, JSON I/O, validator all *derive* from schemas   │
├──────────────────────────────────────────────────────────────┤
│  IO Adapters (the "communication sockets")                   │
│   ─ IOAdapter:       saveScene, loadScene, runPipeline?      │
│   ─ AssetStore:      put/list/getURL/remove for tex + audio  │
│   ─ V1 implementations: browser download/upload + IndexedDB  │
│   ─ V2 implementations: native FS via Tauri/Electron — swap  │
│     in by changing one factory call in main.tsx              │
└──────────────────────────────────────────────────────────────┘
```

**Why this shape over a "3 layers + intermediate translation" design:**
JSON serialization is not a layer — it's a pair of pure functions per component schema. Pulling them into the schema registry is what enables "add a new component without refactoring": one new schema file ships its own serializer, validator, and form rendering hints.

---

## Project Layout

```
psp_engine/Web_Editor/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── README.md                       (V1 dev/run instructions only — no design docs)
└── src/
    ├── main.tsx                    (composition root: builds Core + adapters)
    ├── core/
    │   ├── EditorCore.ts           (facade: mutations + subscribe)
    │   ├── Scene.ts                (in-memory model)
    │   ├── types.ts                (Scene, Entity, ValidationIssue, …)
    │   └── validation/
    │       ├── validateEntity.ts   (cross-component rules from Engine.md §13)
    │       └── validateScene.ts    (count ≤ 256, dense IDs, asset-ref existence)
    ├── schemas/
    │   ├── registry.ts             (collects all schemas; single import for everything else)
    │   ├── transform.ts
    │   ├── sprite.ts
    │   ├── collider.ts
    │   ├── physics.ts
    │   ├── audio.ts
    │   └── playerControlled.ts     (flag-style schema; serializes as top-level bool)
    ├── io/
    │   ├── IOAdapter.ts            (interface — saveScene, loadScene, runPipeline?)
    │   ├── AssetStore.ts           (interface — put/list/getURL/remove)
    │   ├── adapters/
    │   │   ├── BrowserIOAdapter.ts
    │   │   └── IndexedDBAssetStore.ts
    │   └── serialization/
    │       ├── sceneToJson.ts      (iterates registry; honours Engine.md §6 shape)
    │       └── jsonToScene.ts      (round-trip of the same)
    └── ui/
        ├── App.tsx
        ├── ErrorBoundary.tsx       (wraps PropertyPanel + EditorCanvas; a bad schema or render shouldn't blank the editor)
        ├── Toolbar.tsx
        ├── EntityList.tsx          (drag-to-reorder; entity index = draw order, Engine.md §11)
        ├── EditorCanvas.tsx        (SVG, viewBox="0 0 480 272", image-rendering: pixelated for crisp PSP-style pixels)
        ├── PropertyPanel.tsx       (renders fields driven by schema.fields)
        ├── AssetBrowser.tsx        (PNG/WAV upload with format validation, blob preview, audio play button)
        ├── ValidationBadge.tsx
        └── hooks/
            └── useEditorCore.ts    (useSyncExternalStore wrapper)
```

**Boundary enforcement:** ESLint `no-restricted-imports` rules disallow `core/` from importing `ui/` or `io/`, and disallow `schemas/` from importing `ui/`. Cheap to add; prevents the boundary from rotting.

---

## Schema Registry — Concrete Shape

```ts
// core/types.ts
export type FieldKind =
  | { kind: 'int'; min?: number; max?: number }
  | { kind: 'float'; min?: number; max?: number }
  | { kind: 'bool' }
  | { kind: 'enum'; values: { value: number; label: string }[] }
  | { kind: 'colour-abgr' }            // 32-bit ABGR uint
  | { kind: 'asset-ref'; assetType: 'texture' | 'audio' }

export interface FieldSchema {
  name: string                         // 'global_texture_id'
  label: string                        // 'Texture'
  kind: FieldKind
  default: unknown
  optional?: boolean                   // if true, may be omitted-with-default at serialize time (Engine.md §6)
}

export interface ComponentSchema<T = unknown> {
  key: string                          // 'sprite' (matches Engine.md JSON key exactly)
  label: string                        // 'Sprite'
  maskBit: number                      // 2 (matches Engine.md §5.7)
  sizeBytes: number                    // 8 — informational, mirrors Engine.md
  requires?: string[]                  // e.g. ['transform']
  isFlag?: boolean                     // serializes as a top-level bool (e.g. `player_controlled`), not into `components`
  fields: FieldSchema[]                // empty for flag schemas; toggle is presence/absence on the entity
  validate: (data: T, ctx: ValidationContext) => ValidationIssue[]
  serialize: (data: T) => unknown      // flag schemas return a boolean; others return an object
  deserialize: (json: unknown) => T
}
```

Adding a new component (e.g. a future `SceneTrigger`) is exactly:
1. Add `Engine/src/components/scene_trigger.h` (engine work — out of scope for V1).
2. Add `schemas/sceneTrigger.ts` and register it in `schemas/registry.ts`. Field defaults must mirror Engine.md §14.
3. Update `Engine.md` §5, §6, and §14 in the same change; update the drift unit test (see Engine Contract Sync below).

No edits to `EditorCanvas.tsx`, `PropertyPanel.tsx`, `sceneToJson.ts`, or any validator. That is the entire point of the registry.

---

## Editor Core — Public API

```ts
class EditorCore {
  // Scene state
  getScene(): Readonly<Scene>
  subscribe(listener: () => void): () => void

  // Entity ops
  addEntity(displayName?: string): EntityId
  removeEntity(id: EntityId): void
  duplicateEntity(id: EntityId): EntityId                     // inserted directly after source; preserves source's z-relations
  moveEntity(id: EntityId, newIndex: number): void            // entity index = draw order (Engine.md §11)

  // Component ops — `player_controlled` is a flag schema and goes through the same path:
  //   toggle on  = addComponent(id, 'player_controlled')
  //   toggle off = removeComponent(id, 'player_controlled')
  // No bespoke setPlayerControlled method; the registry covers flags too.
  addComponent(id: EntityId, key: string): void               // applies schema defaults
  removeComponent(id: EntityId, key: string): void
  setComponentField(id: EntityId, key: string, field: string, value: unknown): void

  // Asset ops (Core owns ID density; AssetStore is dumb blob storage)
  addTextureAsset(file: File): Promise<AssetId>
  addAudioAsset(file: File): Promise<AssetId>
  removeAsset(type: 'texture' | 'audio', id: AssetId): void   // compacts higher IDs down; rewrites every sprite/audio ref pointing at a renumbered asset

  // Validation
  getValidationIssues(): ValidationIssue[]

  // IO (delegates to injected adapter)
  exportJSON(): SceneJSON
  importJSON(json: SceneJSON): void
}
```

The Core takes `IOAdapter` and `AssetStore` via constructor injection. `main.tsx` wires the browser implementations; a future Tauri build wires native ones. **No undo/redo in V1** — see `Requirements.md` for the deferral rationale and concrete retrofit cost.

---

## IO Adapters — The "Communication Sockets"

```ts
// io/IOAdapter.ts
export interface IOAdapter {
  capabilities: { canRunPipeline: boolean }                              // UI gates the "Build & Run" button on this; never introspects method presence
  saveScene(json: SceneJSON, suggestedName?: string): Promise<void>
  loadScene(): Promise<SceneJSON | null>
  runPipeline?(args: { sceneJSON: SceneJSON }): Promise<{ ok: boolean; log: string }>
}

// io/AssetStore.ts
// Implementation contract:
//   - Validate format at upload: PNG dims must not pad past 512×512; WAV must be 16-bit PCM (Engine.md §13).
//   - Cache one blob URL per asset and revoke it in remove() so the editor doesn't leak across sessions.
//   - Stay a dumb blob-keyed store; Core owns ID density and ref rewriting (see EditorCore.removeAsset).
export interface AssetStore {
  putTexture(file: File): Promise<TextureRecord>      // { id, name, width, height, blobURL }
  putAudio(file: File): Promise<AudioRecord>          // { id, name, sampleRate, channels, blobURL }
  list(type: 'texture' | 'audio'): Promise<AssetRecord[]>
  getURL(type: 'texture' | 'audio', id: number): Promise<string | null>
  remove(type: 'texture' | 'audio', id: number): Promise<void>
}
```

V1 ships `BrowserIOAdapter` (download via `<a download>`, upload via `<input type=file>`) and `IndexedDBAssetStore`. `runPipeline` is **declared but not implemented** in browser — a stub that throws `"runPipeline requires desktop wrapper"`. That stub is the open communication socket: when the desktop wrapper lands, it provides a real implementation and the editor's UI gains a "Build & Run" button without touching Core.

---

## Validation Strategy

Three concentric layers, all running synchronously on every Core mutation. For the V1 ceiling (256 entities × 6 components) the total cost is microseconds — debouncing would only add input lag between a field change and the validation badge update, with no measurable benefit:

1. **Per-field** — `FieldKind` constraints (int range, enum membership). Cheapest; runs synchronously in `setComponentField`.
2. **Per-component** — `schema.validate(data, ctx)` for rules involving multiple fields of one component (e.g. collider width > 0).
3. **Per-entity / scene** — `validateEntity` and `validateScene` enforce the cross-cutting rules from Engine.md §13: sprite needs transform, player_controlled needs physics + transform, entity count ≤ 256, texture/audio IDs are dense from 0, no PNG would pad past 512×512.

Issues attach to `{entityId, componentKey?, fieldName?}` so the UI can surface them inline next to the offending input and aggregate counts in a status badge.

---

## Asset Handling

- **PNG textures** → stored as `Blob` in IndexedDB; rendered in the SVG canvas as `<image href={blobURL} style={{ imageRendering: 'pixelated' }} />` inside each entity's transform rect. The `pixelated` hint preserves PSP-style crisp pixels — without it browsers bilinear-smooth scaled blits and the editor would misrepresent what the engine actually draws. Missing/unloaded assets fall back to a coloured rect using `colour_tint` — matching the engine's own fallback behaviour (Engine.md §5.2).
- **PNG validation at upload** — `putTexture` reads the PNG header, computes the next-power-of-two padded dimensions, and rejects sources that would pad past 512×512 (Engine.md §2). Smaller-but-large images surface a warning in the AssetBrowser with the predicted padded size and RAM cost.
- **WAV audio** → stored as `Blob` in IndexedDB; played via Web Audio API on a "Preview" button in `AssetBrowser`. No waveform display, no timeline scrubbing.
- **WAV validation at upload** — `putAudio` parses the RIFF header and rejects anything that isn't 16-bit PCM with a clear message (Engine.md §13). Stereo is accepted; the audio converter downmixes downstream (Engine.md §5.6).
- **Blob URL lifecycle** — `AssetStore` caches one `URL.createObjectURL` per asset and revokes it in `remove()`. UI components must call `getURL` rather than minting their own URLs, otherwise they leak per render.
- **Asset IDs are dense from zero, enforced by Core.** `AssetStore.put*` allocates the next free integer. Deletion goes through `EditorCore.removeAsset(type, id)`, which calls `AssetStore.remove`, compacts higher IDs down by one, and rewrites every `sprite.global_texture_id` / `audio.sound_id` that pointed at a renumbered asset. There is no "warning on gap" state because gaps cannot exist.

---

## Engine Contract Sync

The TypeScript schemas, type definitions, and validator rules **mirror Engine.md exactly** and must be updated together. V1 keeps this manual (only 6 components). Future improvement (out of scope): generate schemas from a machine-readable engine manifest so Engine.md, `magic_bridge.py`, and the editor cannot drift.

For V1, two cheap mitigations against drift:

1. **Top-of-file comment** in `schemas/registry.ts`: *"If you change a schema here, update `Docs/AI/Web_Application/Engine.md` §5 and `Pipeline/magic_bridge.py` together."* This mirrors the warning already in Engine.md.
2. **Drift unit test** (`schemas/registry.drift.test.ts`) asserting each schema's `(key, maskBit, sizeBytes, ordered field names)` against a hand-typed expected table that mirrors Engine.md §5 verbatim. Any C-side or doc change to a component layout fails this test before a divergent `scene.json` can ship — it is the cheapest possible substitute for the eventual generated-from-manifest solution.

---

## Critical Files (where the work happens)

- `Web_Editor/src/core/EditorCore.ts` — central facade; touch this when adding a new mutation API
- `Web_Editor/src/schemas/registry.ts` — adding/changing components
- `Web_Editor/src/io/IOAdapter.ts` + `Web_Editor/src/io/AssetStore.ts` — the boundaries the desktop wrapper will plug into
- `Web_Editor/src/io/serialization/sceneToJson.ts` — must produce the exact shape in Engine.md §6
- `Web_Editor/src/ui/PropertyPanel.tsx` — schema-driven; should never need editing when a new component is added
- `Web_Editor/src/ui/EditorCanvas.tsx` — SVG renderer; `viewBox="0 0 480 272"` and `image-rendering: pixelated` to match PSP screen 1:1
- `Web_Editor/src/ui/EntityList.tsx` — drag-to-reorder; entity index = draw order (Engine.md §11)

Reference (read-only) — already exists and authoritative:
- `Docs/AI/Web_Application/Engine.md` — the contract
- `Pipeline/magic_bridge.py` — the JSON consumer (must agree with `sceneToJson.ts`)

---

## Build / Run Setup

- `npm create vite@latest Web_Editor -- --template react-ts`
- Add deps: `idb` (small wrapper over IndexedDB), `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` for tests.
- `tsconfig.json` baseline: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noFallthroughCasesInSwitch": true`. ESLint baseline: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, plus the `no-restricted-imports` rules described above. `no-restricted-imports` is built into ESLint core — no plugin needed (an earlier draft of this plan listed `eslint-plugin-import`, which was incorrect; that plugin's `import/no-restricted-paths` rule is similar but unnecessary and currently lags ESLint 10's peer-dep range).
- `npm run dev` → http://localhost:5173 ; `npm run build` → static `dist/` (drop-in to any host or to a future Tauri shell).
