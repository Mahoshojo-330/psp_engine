# AI KNOWLEDGE BASE: PSPSDK & PSP HARDWARE

## 1. HARDWARE CONSTRAINTS
- **CPU:** MIPS R4000 (Allegrex) @ 333MHz
- **FPU/VFPU:** Fast floating-point math. Avoid double precision `double`. Always use `float`.
- **RAM:** PSP-1000 = 32MB (24MB usable). PSP-2000 = 64MB (56MB usable).
- **VRAM:** 2MB mapped in uncached space.
- **Cache:** 16KB Instruction, 16KB Data. Data cache is NOT coherent with VRAM or DMA (use `sceKernelDcacheWritebackInvalidateAll()` before DMA/GU rendering).

## 2. PSPSDK CORE AWARENESS
- **Source:** https://pspdev.github.io/pspsdk/
- **Memory Allocation:** Hard-coded `malloc()` sizes are an anti-pattern. 
  - **Best Practice:** Use `PSP_HEAP_SIZE_KB(-1)` to dynamically allocate all available RAM to the PRX heap, then `sceKernelTotalFreeMemSize()` to size custom Arena Allocators.
- **Build System:** Always output PRX unless debugging GDB locally. 
  - `BUILD_PRX = 1`
  - `PSP_LARGE_MEMORY = 1`
  - Utilizes `psp-build-exports`, `psp-fixup-imports`, and `pack-pbp` to generate `EBOOT.PBP`.

## 3. PACKAGE CAPABILITIES (psp-pacman)
- **Source:** https://pspdev.github.io/psp-packages/
- **Avoid:** Heavy C++ standard library usage or large memory-managed libraries if possible.
- **Critical Libraries for Engine:**
  - `libGU` / `libGUM`: Raw access to the Graphics Engine (GE). Requires creating a Display List (DL) buffer.
  - `stb`: (`stb_image`, `stb_vorbis`) Zero-dependency, low-overhead assets.
  - `libpspvram`: VRAM allocation manager.
  - `libintrafont`: Native font rendering via SCE's system firmware fonts.
  - `libmad` / `libogg`: Audio streaming from UMD/Memory Stick.

## 4. ENGINE ARCHITECTURE CONTEXT
- **Paradigm:** Data-Oriented Design (DOD). Dense component arrays (`TransformComponent`, `SpriteComponent`).
- **Memory Management:** Custom Linear Arena Allocators. Do NOT use `free()` during the main game loop.
- **Asset Pipeline:** Desktop Python pipeline compiles JSON to raw binary (`.raw`/`.tim2`). Game engine reads via `fread()` directly into the component/asset arrays (Zero-parsing architecture).
