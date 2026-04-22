# PSPSDK & PSP Hardware Reference

## Hardware Constraints
| Resource | PSP-1000 | PSP-2000+ |
|----------|----------|-----------|
| CPU | MIPS R4000 (Allegrex) @ 333MHz | Same |
| Usable RAM | 24MB | 56MB |
| VRAM | 2MB (uncached) | 2MB (uncached) |
| I-Cache / D-Cache | 16KB / 16KB | 16KB / 16KB |

- **Always `float`, never `double`** — the VFPU is single-precision only.
- **D-Cache is NOT coherent** with VRAM or DMA. Call `sceKernelDcacheWritebackInvalidateAll()` before any GU render or DMA transfer.

## Build System
```makefile
BUILD_PRX = 1
PSP_LARGE_MEMORY = 1        # Access extra RAM on PSP-2000+
PSP_HEAP_SIZE_KB(-1)        # Grab all available RAM for PRX heap
```
Output chain: `psp-build-exports` → `psp-fixup-imports` → `pack-pbp` → `EBOOT.PBP`

## Key Libraries
| Library | Purpose |
|---------|---------|
| `libgu` / `libgum` | Graphics Engine — display lists, draw commands |
| `stb_image` | PNG/JPG decode (for desktop pipeline; engine should use pre-decoded) |
| `libpspvram` | VRAM allocation manager |
| `libintrafont` | System firmware font rendering |
| `libmad` / `libogg` | Audio streaming |

## Memory Best Practices
- `PSP_HEAP_SIZE_KB(-1)` + `sceKernelTotalFreeMemSize()` to size arenas dynamically.
- Hard-coded `malloc()` sizes are an anti-pattern.
- No `free()` during game loop. Arena reset between scenes.

## GU Pipeline Notes
- Display list buffer must be 16-byte aligned (`__attribute__((aligned(16)))`).
- Frame pattern: `sceGuStart` → draw commands → `sceGuFinish` → `sceGuSync` → `sceDisplayWaitVblankStart` → `sceGuSwapBuffers`.
- 2D rendering: `GU_SPRITES` primitive with `GU_TRANSFORM_2D` flag. Two vertices per sprite (top-left, bottom-right).
- Texture power-of-2 not strictly required but strongly recommended for performance.
- ABGR color format (not RGBA).
