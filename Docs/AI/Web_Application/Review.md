# Web Application — Review Notes

Findings from review of commit `0dd1212` "WebApplication V1.5".

## Issues / suggestions

1. **Bundling V1.1 + V1.5 in one commit deviates from the plan.** `Docs/AI/Web_Application/Approach/V1_1.md` describes a separately landable slice. All `core/`, `schemas/`, `ui/` files in this commit are `new file mode`, so V1.1 was never committed standalone. Not a code issue, but a process one — if V1.5 has a regression you can't bisect to V1.1.

2. **Stray session-ID footer in V1.1 doc.** `Docs/AI/Web_Application/Approach/V1_1.md:148` now ends with `# claude --resume 22f882de-3a13-49ec-a84d-84b335881305`. Looks like an accidental paste; should probably be removed.

3. **`aria-selected` on `<rect>` is a CSS hook, not real a11y.** `Canvas.tsx:84` sets `aria-selected={selected}` on a bare `<rect>` with no role. Screen readers won't announce selection. The V1_5.md plan justifies it as "communicates selection to assistive tech" — that's only true on `EntityList.tsx` (which correctly uses `role="option"` inside `role="listbox"`). For the canvas it's just a CSS attribute selector with extra ARIA flavoring. Fine if honest about it; rename or just use a `data-selected` attribute if you want to drop the pretense.

4. **Hand-rolled 2D matrix inverse instead of `DOMMatrix.inverse()`.** `screenToCanvas.ts:11-23` deviates from the V1_5.md plan ("uses `getScreenCTM().inverse()` applied to a `DOMPoint`"). Math is correct (standard affine inverse), and presumably this was done because jsdom doesn't implement `DOMMatrix` properly — but worth a one-line comment saying so, otherwise a future reader will "simplify" it back to `.inverse()` and break the tests.

5. **Two `setField` calls per pointer move.** `Canvas.tsx:39-40` calls `setField(... 'x' ...)` then `setField(... 'y' ...)`, each emitting to all listeners. During a drag this doubles the React re-render rate. Not a correctness bug, but if drag feels janky later, a `setFields(id, key, partial)` batch on `EditorCore` is the fix.

6. **`PropertyPanel` is hardcoded to `transformSchema`** (`PropertyPanel.tsx:23, 41`). The whole point of the schema/registry was to make the panel iterate over an entity's components. V1.5's scope only has one component so it works, but the panel is the place where the architecture earns its keep — would be more honest to iterate `Object.keys(entity.components)` against `REGISTRY` even today, so V2 doesn't need to rewrite it.

7. **`EMPTY_SCENE` is a module-level shared object** (`EditorCore.ts:4`). Two `EditorCore` instances start with identical references. Currently safe because mutation always replaces `this.scene`, never mutates in place — but it's a pun waiting to bite. Cheap fix: inline `{ entities: [], selectedEntityId: null }` in the field initializer.

8. **Number input UX edge case.** `PropertyPanel.tsx:69-72` — typing `1.` or `-` mid-edit will round/parse and overwrite the input, making decimals annoying to enter. Known controlled-input issue; acceptable for V1.5, but flag it as a V2 polish item.
