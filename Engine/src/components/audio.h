/*
Audio Component — per-entity audio playback control

Binary layout (12 bytes, 4-byte aligned):
    int   sound_id           4 bytes   index into audio_assets[] table
    float volume             4 bytes   0.0 to 1.0
    uint8_t loop             1 byte    0 = play once, 1 = loop
    uint8_t state            1 byte    0 = stopped, 1 = playing, 2 = pending
    uint8_t padding[2]       2 bytes
*/

#ifndef COMPONENTS_AUDIO_H
#define COMPONENTS_AUDIO_H

#include <stdint.h>

// 12 bytes
typedef struct {
    int      sound_id;
    float    volume;
    uint8_t  loop;       // 0 = play once, 1 = loop
    uint8_t  state;      // 0 = stopped, 1 = playing, 2 = pending
    uint8_t  padding[2];
} Audio_Component;

#endif
