# Audio Implementation Plan

## Overview

Audio splits into two distinct problems: **SFX** (short sounds, fully loaded into RAM, fire-and-forget) and **BGM** (music, streamed from disc via a dedicated thread). SFX is implemented first because it's simpler and testable without threading. BGM follows as a second step.

PSP has 8 hardware audio channels via `sceAudio`. Reserve channel 0 for BGM, channels 1-7 for SFX. That gives 7 concurrent sound effects — more than enough for a 2D game.

## What Already Exists

- `Audio_Component` struct in `src/components/audio.h` (12 bytes: sound_id, volume, loop, state, padding)
- `COMP_AUDIO = 1 << 6` commented out in `ecs.h`
- Empty `audio.c`, commented-out `audio_system_update()` in `systems.h`
- No `Audio_Component` array in ECS globals
- No audio asset loading or pipeline packing

## Audio Asset Format

### SFX — Pre-decoded PCM `.raw` files (like textures)

Pipeline converts WAV files to raw PCM. File format:
```
[uint32 sample_count]    4 bytes
[uint32 sample_rate]     4 bytes    (e.g. 22050 for SFX, 44100 for high-quality)
[uint16 channels]        2 bytes    (1=mono, 2=stereo — prefer mono for SFX, saves RAM)
[uint16 padding]         2 bytes
[int16  pcm_data...]     sample_count * channels * 2 bytes
```

Naming convention: `sfx_{id}.raw` (matches `sound_id` in Audio_Component, same pattern as `tex_{id}.raw`).

**RAM budget:** A 1-second mono 22050Hz SFX = ~43KB. 20 sound effects = ~860KB. Comfortable on PSP.

### BGM — Compressed, streamed from disc

OGG Vorbis via `libogg`/`libvorbisfile` (already available in PSPSDK toolchain, better than MP3 for looping — no encoder delay gap). Streamed in small chunks by a background thread, never fully loaded.

Naming convention: `bgm_{id}.ogg`.

**Why not raw PCM for BGM:** A 3-minute stereo 44100Hz track = ~30MB raw. That's the entire PSP RAM. Streaming compressed audio is the only sane option.

**Why OGG over MP3:** MP3 has an inherent encoder delay that causes an audible gap on loop. OGG loops seamlessly. `libvorbisfile` provides a simpler streaming API than `libmad`. Both are available in PSPSDK but OGG is the better fit.

## Engine-Side Data Structures

### Audio asset table (system-internal, not a component)

```c
#define MAX_AUDIO_ASSETS 32
#define MAX_SFX_CHANNELS 7
#define BGM_CHANNEL 0
#define AUDIO_BUFFER_SAMPLES 1024   // samples per sceAudio output call

typedef struct {
    int16_t* samples;       // PCM data pointer (arena-allocated, NULL for BGM)
    uint32_t sample_count;
    uint32_t sample_rate;
    uint16_t channels;      // 1=mono, 2=stereo
    uint8_t  is_bgm;        // 0=SFX (in RAM), 1=BGM (streamed)
    uint8_t  padding;
} Audio_Asset;
```

### Channel state (system-internal)

```c
typedef struct {
    int      entity_id;     // which entity owns this channel (-1 = free)
    uint32_t cursor;        // current sample position in the PCM data
    int      psp_channel;   // sceAudio channel handle
} Channel_State;
```

The system manages 7 SFX channel slots + 1 BGM slot. This is internal to `audio.c` — not exposed as a component. Components stay pure data; channel bookkeeping is system logic.

### BGM state (system-internal)

```c
typedef struct {
    OggVorbis_File vf;       // libvorbisfile handle
    int16_t  buffer[2][AUDIO_BUFFER_SAMPLES * 2];  // double buffer (stereo)
    int      active_buf;     // which buffer is being played
    int      psp_channel;    // reserved channel handle
    int      entity_id;      // entity controlling BGM (-1 = none)
    float    volume;
    uint8_t  loop;
    volatile uint8_t playing; // flag for thread communication
} BGM_State;
```

## Implementation Order

### Step 1: SFX (no threading, no BGM)

**ECS integration:**
- Uncomment `COMP_AUDIO = 1 << 6` in `ecs.h`
- Add `#include "../components/audio.h"` to `ecs.h`
- Add `extern Audio_Component audio_components[MAX_ENTITIES];` to `ecs.h`
- Define the array in `ecs.c`
- Add audio array zeroing to `ECS_Clean()`

**Audio asset loading** (`loaders/asset_loader.c` or new `loaders/audio_loader.c`):
- `load_sfx(arena, path, id)` — reads `.raw` PCM file into arena, populates `audio_assets[id]`
- `load_scene_audio(arena, base_path)` — scans entities with `COMP_AUDIO`, loads referenced `sfx_{sound_id}.raw` files (same pattern as `load_scene_textures`)

**Audio system** (`systems/audio.c`):
- `audio_init()`:
  - Reserve SFX channels: `sceAudioChReserve(ch, AUDIO_BUFFER_SAMPLES, PSP_AUDIO_FORMAT_MONO)` for channels 1-7
  - Initialize channel states to free (-1)
- `audio_system_update()`:
  - Iterate entities with `COMP_ACTIVE | COMP_AUDIO`
  - **state == 2 (pending):** Find a free SFX channel. If found, set channel's entity_id and cursor=0, change state to 1 (playing). If no free channel, skip (sound is dropped — acceptable for V1).
  - **state == 1 (playing):** Feed next chunk of PCM data to the channel via `sceAudioOutputPannedBlocking()`. When cursor reaches end: if `loop == 1`, reset cursor to 0; if `loop == 0`, set state = 0 and free the channel.
  - **state == 0 (stopped):** If this entity still owns a channel, release it.
- `audio_cleanup()`:
  - Release all reserved channels: `sceAudioChRelease(ch)`

**Important detail — blocking vs non-blocking output:**
`sceAudioOutputPannedBlocking()` blocks until the hardware consumes the buffer. This is fine for a background thread but NOT fine on the main thread — it would stall the game loop.

Two options for SFX without threading:
1. **Use `sceAudioOutput()` (non-blocking)** + check channel status each frame. Only submit a new buffer when the previous one is consumed. This keeps the main loop smooth.
2. **Use a single SFX thread** that services all SFX channels.

Option 1 is simpler for V1. Each frame, for each active SFX channel, check if the channel is ready for more data (`sceAudioGetChannelRestLen()` returns 0 when the buffer is consumed), and if so, submit the next chunk. If still playing, skip.

**Pipeline update** (`magic_bridge.py`):
- Add Audio_Component packing after Physics in the binary blob
- Blob layout becomes: `[count][masks][transforms][sprites][colliders][physics][audio]`
- New pipeline tool: `audio_converter.py` — WAV to `.raw` PCM (strip WAV header, write our header + raw samples)

**Scene parser update** (`loaders/scene_parser.c`):
- Add memcpy for audio array from blob (same pattern as other components)

**Makefile:**
- Add `build/src/systems/audio.o` to OBJS
- Add `-lpspaudio` to LIBS

**Main loop wiring:**
```
input_system_update();
physics_system_update();
collision_system_update();
audio_system_update();      // <-- new, after game logic, before render
startFrame();
render_system_update();
endFrame();
```

Audio after collision so that collision-triggered sounds (future) would have their state set before the audio system reads it. Before render because render + vsync is the frame boundary.

### Step 2: BGM Streaming (adds threading + OGG decoding)

**BGM thread:**
- Created in `audio_init()` via `sceKernelCreateThread("bgm_thread", bgm_thread_func, 0x12, 0x4000, 0, NULL)`
  - Priority 0x12 (slightly lower than main thread at 0x11) — BGM should yield to gameplay
  - Stack size 0x4000 (16KB) — enough for vorbis decode buffers
- Thread function: infinite loop
  - If `bgm_state.playing`: decode next chunk from OGG into inactive buffer, swap buffers, output via `sceAudioOutputPannedBlocking()` on BGM_CHANNEL
  - If not playing: `sceKernelSleepThread()` — woken by main thread when BGM starts
  - On loop point: `ov_pcm_seek(&vf, 0)` for seamless restart

**BGM control functions (called from audio_system_update on main thread):**
- `bgm_play(sound_id, volume, loop)` — open OGG file, wake BGM thread
- `bgm_stop()` — signal thread to stop, close file
- `bgm_set_volume(volume)` — update volume for next output call

**How audio_system_update handles BGM:**
- If an entity has `COMP_AUDIO` and its `sound_id` references a BGM asset (`audio_assets[id].is_bgm == 1`):
  - state pending → call `bgm_play()`
  - state stopped → call `bgm_stop()`
  - Only one BGM at a time. If a new BGM entity goes pending while one is playing, stop the old one first.

**Thread safety:**
- BGM_State fields written by main thread (`playing`, `volume`, `loop`) are simple atomic-width writes (uint8/float). No mutex needed — the thread reads them each iteration. Worst case: one buffer plays at old volume. Acceptable.
- `sceKernelWakeupThread()` / `sceKernelSleepThread()` for start/stop signaling (PSP kernel primitives, no busy-wait).

**Makefile additions:**
- Add `-lvorbisfile -lvorbis -logg` to LIBS
- Add `-lpspaudio` if not already present (needed for Step 1 too)

## Audio_Component State Machine

```
Entity created with COMP_AUDIO
         |
    state = 2 (pending)   <--- set by scene load or future event system
         |
  audio_system_update() picks it up
         |
    state = 1 (playing)   <--- channel assigned, playback started
         |
    sound finishes
         |
    loop == 1? ──yes──> cursor = 0, stay in state 1
         |
        no
         |
    state = 0 (stopped)   <--- channel freed
```

Transition from stopped back to pending would be driven by game logic (e.g., event triggers). For V1, audio entities start in `pending` state from the scene blob — they play on scene load. Stop/restart requires a future event system.

## Files to Create / Modify

### New files:
- `Pipeline/audio_converter.py` — WAV to `.raw` PCM converter
- (No new .c files — `audio.c` already exists, just empty)

### Modified files:
- `Engine/src/core/ecs.h` — Uncomment COMP_AUDIO, add audio include + extern array
- `Engine/src/core/ecs.c` — Define Audio_Component array, add to ECS_Clean()
- `Engine/src/systems/audio.c` — Full SFX system (Step 1), then BGM thread (Step 2)
- `Engine/src/systems/systems.h` — Uncomment audio_system_update(), add audio_init(), audio_cleanup()
- `Engine/src/main.c` — Call audio_init() at startup, audio_system_update() in loop, audio_cleanup() at exit
- `Engine/src/loaders/asset_loader.c` (or new audio_loader) — SFX .raw loading
- `Engine/src/loaders/scene_parser.c` — Parse audio array from blob
- `Engine/Makefile` — Add audio.o, -lpspaudio, (Step 2: -lvorbisfile -lvorbis -logg)
- `Pipeline/magic_bridge.py` — Pack Audio_Component into binary blob

## What This Plan Does NOT Include

- **Positional/spatial audio** — No panning based on entity position. All sounds play at center. Spatial audio is a post-V1 feature (needs listener position concept).
- **Sound priority system** — If all 7 SFX channels are full, new sounds are dropped. A priority queue (e.g., closer sounds replace farther ones) is unnecessary at this entity count.
- **Audio mixer** — No software mixing. Each sound gets its own hardware channel. The PSP mixes in hardware. If we ever exceed 7 concurrent SFX, a software mixer would be needed — but that's unlikely for a 2D game.
- **Fade in/out** — Volume is set per-entity but doesn't interpolate. Fading needs a timer/tween system that doesn't exist yet.
- **Dynamic music (layers/stems)** — Way beyond V1 scope.
- **AT3 format** — Sony's proprietary format. Better compression than OGG on PSP but requires `libatrac3plus` and complicates the pipeline. OGG is more portable and good enough.
- **Audio_Component.state transitions from game logic** — V1 audio entities auto-play on scene load (start in pending state). Triggering sounds from collisions/events needs the event system from M3.

## Open Questions

- **Mono vs stereo SFX:** Mono halves RAM usage and most 2D SFX don't need stereo. Recommend mono for SFX, stereo for BGM. The asset format supports both — converter should default to mono downmix for SFX.
- **Sample rate for SFX:** 22050Hz is fine for effects (explosions, clicks, footsteps). 44100Hz for anything that needs clarity (voice lines). Converter should accept a flag. PSP hardware resamples transparently via `sceAudioChReserve` sample rate parameter — but matching native rate avoids resampling artifacts.
- **Should audio_converter.py be merged into texture_converter.py as a general asset tool?** Probably not — different input formats, different output formats. Keep them separate. A future unified `asset_pipeline.py` could wrap both.
- **BGM file location:** Should BGM files live alongside scene assets in `build/scenes/` or in a separate `build/audio/` directory? Separate directory is cleaner but the loader needs to know the path. Recommend `build/scenes/` for now (same as textures), split later if it gets crowded.
