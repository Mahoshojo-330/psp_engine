
### Dynamic Headroom

Instead of hardcoding a massive max limit forever, you tell your Arena to create a custom-sized array just for the current level. 

**How it works:**
1. **Peek the File:** Open the binary file and read *only* the first 4 bytes to get the `entity_count` (e.g., 50 entities).
2. **Add Headroom:** Add the maximum number of dynamic objects you expect for that specific level (e.g., 50 file entities + 100 slots for bullets/particles = 150 total slots).
3. **Allocate on Arena:** Push enough memory onto the Arena for exactly 150 entities. 
4. **Point and Read:** Point your ECS pointers (`Transform_Component*`, etc.) to this new memory block. Read the rest of the file directly into the start of the block.

**Why this is the best:**
* The first 50 slots are instantly filled with your level data (Zero-Copy).
* The next 100 slots are perfectly empty and waiting for your ECS to spawn bullets into them.
* When the level ends, the Arena resets, and you get 100% of that RAM back.


---

### Render Loop Notes

- `startFrame` MUST call `sceKernelDcacheWritebackInvalidateAll()`. Textures live in cached main RAM (arena-allocated), but the GPU reads via DMA which bypasses the D-cache. Without the flush, the GPU reads stale/garbage pixel data. This is the #1 PSP rendering bug.

- `endFrame` should own the full frame teardown: `sceGuFinish → sceGuSync → sceDisplayWaitVblankStart → sceGuSwapBuffers`. The existing standalone `sceDisplayWaitVblankStart()` in main.c gets removed — don't split vsync and swap across two files, it invites ordering bugs.

- `render_system_update` draws each sprite as a `GU_SPRITES` primitive (2 vertices: top-left, bottom-right) using `GU_TRANSFORM_2D`. The `TextureVertex` struct layout already matches the GU vertex format flags `GU_TEXTURE_32BITF | GU_COLOR_8888 | GU_VERTEX_32BITF`.

- Sort sprites by `global_texture_id` before drawing. Texture binds (`sceGuTexImage`) are expensive on PSP. With 256 max entities, even a naive sort is microseconds and saves real GPU time by skipping redundant rebinds.

### Texture Loading Notes

- Pixel data goes in the arena (scene-transient, freed on `Arena_Reset`). The `Texture` struct array (`texture_table[MAX_TEXTURES]`) is a global, matching the ECS pattern.

- Don't bother with VRAM textures. After double framebuffers + depth buffer, only ~640KB VRAM remains. Main RAM textures work fine for 2D — the GPU reads them via DMA. The dcache flush in `startFrame` handles coherency. VRAM is a micro-optimization to revisit only if profiling shows texture fetch is actually the bottleneck.

- Texture buffer stride must be power-of-2 (64, 128, 256, 512) for `sceGuTexImage`. The display width can be anything, but the stride the GPU walks must be PoT. `texture_load` should compute and store this stride. The pipeline should enforce PoT dimensions during export.

### Input System Notes

- `COMP_INPUT` should NOT be zero-size. Add an `Input_Component` with at least `float move_speed` (4 bytes). Without it, every player-controlled entity moves at the same hardcoded speed, which breaks the "non-programmers configure everything in the editor" philosophy. The editor gets a "Movement Speed" slider for free.

- Delta time is a constant `1.0f / 60.0f` since we vsync to 60fps. Don't compute it dynamically — PSP has no reliable high-res timer worth the complexity. Just `#define FIXED_DT (1.0f / 60.0f)` and multiply `move_speed * FIXED_DT`.