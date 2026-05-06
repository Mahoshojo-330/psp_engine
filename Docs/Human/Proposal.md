# Proposal — engine-side issues surfaced from the editor

Notes from building V1.5 of the web editor against `Docs/AI/Web_Application/Engine.md`.
These are problems with the engine contract, not the editor. Listed roughly by
impact on what games are *expressible* today.

## 1. The `audio` component is unusable as written

Engine.md §5.6: every audio entity gets `state = 2 (pending)` hardcoded at
scene load, and §12 confirms there is no event/trigger system. Result: an
audio entity can only "start when the scene loads, then play once or loop
forever." That's BGM-as-looping-SFX and nothing else. Jump sounds, hit
sounds, pickup sounds — none are authorable in the editor today, because
there's no way to attach "play sfx_3 when entity X collides with a
player_controlled entity" to anything.

This makes the entire `audio` component dead weight in V1 except as a
BGM stand-in. Either:

- Delete the component until the trigger system lands, OR
- Add the smallest useful trigger primitive — e.g. a `play_on_collide` flag
  that fires the sound on the first overlap with any `player_controlled`
  entity. Even one hardcoded trigger turns the component on.

The Human/Engine.md "M3 Game Logic — not started" already covers triggers
generally; this is the specific component blocked by it.

## 2. No runtime spawn/destroy locks out a huge class of games

Engine.md §12: ECS arrays are populated once from the scene blob and never
grow. So no projectiles, particles, pickups-that-disappear-on-touch,
enemies-that-die, doors-that-spawn-an-openable, …. Every entity in a level
is hand-placed in the editor and stays there forever.

Combined with #1, the editor today can only author static dioramas with
optional gravity. That's a large gap from "make a game" — and the C cost is
modest: an `is_alive` bit alongside `ACTIVE`, an entity-pool free list, and
having every system check `alive` where it currently checks `ACTIVE`.

Worth doing before piling on more components.

## 3. `gravity_direction` is a 4-value cardinal enum

Engine.md §5.4: `gravity_direction: uint8` with values `0=down, 1=up, 2=left,
3=right`. Per-entity gravity is already an unusual choice (most engines have
one global vector and an "affected by gravity" bool); restricting it to four
cardinal directions makes it actively bad. No diagonal gravity, no slope
gravity, no radial-toward-a-point gravity, no smooth rotation between
directions.

Two saner shapes:

- **Global gravity**: one `gravity: {x, y}` on the scene; per-entity
  `gravity_scale: float` (default 1.0, 0 = unaffected).
- **Per-entity vector**: replace `gravity_magnitude` + `gravity_direction`
  with `gx: float, gy: float`. Strictly more expressive; same byte count
  if `gravity_direction` was padding.

The current shape can't grow into either without breaking saved scenes.

## 4. `colour_tint` exposes ABGR byte order to humans

Engine.md §5.2 and §6: `colour_tint` is a `uint32` in PSP/ABGR order, written
into JSON as a decimal integer (`4294967295` = white). That's machine-friendly
on the C side and unreadable everywhere else — the JSON can't be diffed,
the editor's colour picker has to swap bytes before serialising, and any
human who opens scene.json sees magic numbers.

Fix lives entirely in the pipeline: accept `"#RRGGBBAA"` strings in JSON,
let `magic_bridge.py` convert to uint32 ABGR. ~5 lines, no engine change.
Then `#FF0000FF` is obviously red and the editor can use the platform
colour-picker output as-is.

## 5. `collider.flags` is uint32 with one bit used

Engine.md §5.3: a `flags` uint32 where only bit 0 (`is_solid`) is defined
and "all other bits reserved." Either the reserved bits have a planned use
(in which case spec them now so the editor and pipeline can stay forward-
compatible), or there is no plan, in which case `is_solid: bool` would say
the same thing without the editor needing a "flags" mental model.

Right now this is the only field in the schema that pretends to be
extensible without committing to an extension.

## 6. `player_controlled` is a special case in the JSON shape

Engine.md §5.5/§6: every other component is an object under `components`.
`player_controlled` alone is a top-level bool on the entity. That's the
editor's first special case in serialisation, and the model ("components
are objects, except this one which is a flag") doesn't generalise — any
future flag-only component repeats the special case.

Pick one shape. Either:

- All components are objects under `components`, flag-only components
  serialise as `{}` or are omitted-vs-present (presence = true), OR
- Top-level booleans are a documented kind, and the editor knows about
  them as a class.

The first is less code in pipeline + editor. Today's shape costs both.

## 7. One global control scheme

Engine.md §8: the input system writes the same velocity to every entity
with `COMP_INPUT | COMP_PHYSICS`. Multiple `player_controlled` entities
all move identically. So no "switch character on a button press" mechanic,
no "this entity uses left/right only", no two-character co-op even on
controllers that exist (the PSP has one, but the engine outlives the PSP).

The current `player_controlled` flag could grow into a small struct
(`controller_id`, `binding_mask`) without breaking existing scenes — the
flag becomes "any binding active." Cheap to design now, expensive to
retrofit once N scenes use the flag form.

## 8. `id` and `display_name` fields exist in JSON but the engine ignores them

Engine.md §6 notes `id` is editor bookkeeping (entity index = array
position) and `display_name` "doesn't round-trip through the binary." They
are still in the JSON example. The editor currently emits `id`. If they're
truly editor-only, the cleaner contract is: editor writes them, pipeline
strips them, JSON spec marks them as informational. That removes the temptation
for `magic_bridge.py` to ever start trusting `id`.

This is small, but it's the kind of "soft contract" that breaks silently
the day someone reorders entities and assumes `id` is stable.

---

## Suggested ordering (editor-author's view)

1. **Trigger primitive** (unblocks #1, partially unblocks #2's "destroy on
   condition", and is on the M3 list anyway).
2. **Spawn/destroy** (#2) — needed for every non-trivial game.
3. **Gravity reshape** (#3) and **flags reshape** (#5) — schema breaks; do
   them before more scenes exist.
4. **JSON readability** (#4 colour_tint, #6 player_controlled, #8 id) —
   pipeline-only changes; cheap polish that pays back every time someone
   reads scene.json by hand.
5. **Per-entity input binding** (#7) — least urgent; can wait until a real
   game asks for it.
