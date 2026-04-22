M1 (MVP) — Complete
ECS core, scene parser, render loop, texture loading, input — all done
Pipeline: binary format, JSON compiler, PNG → .raw converter — all done
Missing: Web editor (still hand-written JSON in test_scene.json)
M2 (Interactivity) — Mostly complete
Physics (velocity + 4-direction gravity), input, collision (AABB + push-apart), SFX audio — done
Missing: BGM streaming (OGG Vorbis on a kernel thread)
M3 (Game Logic) — Not started
No event/trigger system, no dialogue, no scene transitions, no layer sorting

##

Honest Critique — Things to Reconsider
1. The web editor is the biggest gap. Engine is ahead of authoring. A non-programmer cannot use any of this today. M1's stated goal ("user places sprites in editor") is unmet despite M2 being done. Recommend prioritizing the editor before M3.

2. ECS storage will hurt at scale. Indexing parallel arrays by entity ID with MAX_ENTITIES=256 means systems iterate 256 slots even if 5 entities are active. Fine for now, but the post-V1 "dense arrays / sparse sets" note in EngineStatus.md:30 becomes load-bearing the moment scenes get larger.

3. Collision is O(N²). Acceptable at N=10, ugly at N=50 on MIPS. Spatial hash or grid is a small change with a big payoff — worth doing before M3 levels.

4. No fixed timestep. Physics is per-frame, vsync-locked. If a frame stutters, gravity/velocity desync. The roadmap dismisses variable timestep but doesn't commit to fixed-step accumulator either. Should pick one explicitly.

5. Texture atlas is "later" — but render currently rebinds per sprite. This will cap sprite count well before RAM does. Pipeline-only change as noted, ~20 lines in render. Worth scheduling, not just listing.

6. Asset packing. Loose .raw files on the Memory Stick = slow seeks. The .pak archive concern in Architecture.md:233 is real and gets worse as asset count grows.

7. player_controlled.h is dead code. Either delete or commit to using it.

##

Suggested Order for V1.x
Web editor MVP (unblocks the actual product thesis)
BGM streaming (closes M2)
Spatial-grid collision + texture atlas (perf headroom before M3 content)
Event/trigger + scene transitions (M3 core)
Dialogue + layer sorting (M3 finish)
Stretch goals (Lua, code stripping, AI function calling) are correctly parked — none of them matter until the editor exists and a real game has been built end-to-end.