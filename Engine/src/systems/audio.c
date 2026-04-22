/*
Audio System — SFX playback via PSP hardware channels.

Uses non-blocking sceAudioOutput() on the main thread.
Each frame: service active channels (feed next PCM chunk), start pending sounds.

Channel 0 reserved for future BGM. Channels 1-7 available for SFX.
Audio assets are pre-decoded mono PCM int16 loaded into arena memory.
*/

#include <pspaudio.h>
#include <string.h>
#include "../core/ecs.h"
#include "../loaders/asset_loader.h"

#define AUDIO_BUFFER_SAMPLES 1024   /* must be 64-aligned for sceAudio */
#define MAX_SFX_CHANNELS     7
#define SFX_CHANNEL_BASE     1      /* channels 1-7; 0 reserved for BGM */

typedef struct {
    int16_t  buffer[AUDIO_BUFFER_SAMPLES] __attribute__((aligned(64)));
    int      entity_id;     /* -1 = free */
    int      psp_channel;   /* handle from sceAudioChReserve */
    uint32_t cursor;        /* current sample offset into asset */
} Channel_State;

/* Globals */
Channel_State sfx_channels[MAX_SFX_CHANNELS];


static int find_free_channel(void) {
    for (int i = 0; i < MAX_SFX_CHANNELS; i++) {
        if (sfx_channels[i].entity_id < 0) return i;
    }
    return -1;
}

static void fill_and_submit(int ch, Audio_Component* ac) {
    Channel_State* cs = &sfx_channels[ch];
    Audio_Asset*   asset = &audio_assets[ac->sound_id];

    uint32_t remaining = asset->sample_count - cs->cursor;
    uint32_t to_copy = remaining < AUDIO_BUFFER_SAMPLES ? remaining : AUDIO_BUFFER_SAMPLES;

    memcpy(cs->buffer, asset->samples + cs->cursor, to_copy * sizeof(int16_t));

    /* Zero-pad if less than a full buffer (end of sound) */
    if (to_copy < AUDIO_BUFFER_SAMPLES) {
        memset(cs->buffer + to_copy, 0,
               (AUDIO_BUFFER_SAMPLES - to_copy) * sizeof(int16_t));
    }

    int vol = (int)(ac->volume * (float)PSP_AUDIO_VOLUME_MAX);
    if (vol > PSP_AUDIO_VOLUME_MAX) vol = PSP_AUDIO_VOLUME_MAX;
    if (vol < 0) vol = 0;

    sceAudioOutput(cs->psp_channel, vol, cs->buffer);
    cs->cursor += to_copy;
}


void audio_init(void) {
    for (int i = 0; i < MAX_SFX_CHANNELS; i++) {
        sfx_channels[i].entity_id = -1;
        sfx_channels[i].cursor = 0;
        sfx_channels[i].psp_channel = sceAudioChReserve(
            SFX_CHANNEL_BASE + i,
            AUDIO_BUFFER_SAMPLES,
            PSP_AUDIO_FORMAT_MONO
        );
    }
}


void audio_system_update(void) {
    uint32_t required = COMP_ACTIVE | COMP_AUDIO;

    /* 1. Service active channels — feed next chunk when hardware is ready */
    for (int ch = 0; ch < MAX_SFX_CHANNELS; ch++) {
        if (sfx_channels[ch].entity_id < 0) continue;

        int eid = sfx_channels[ch].entity_id;
        Audio_Component* ac = &audio_components[eid];

        /* Entity deactivated or audio stopped externally */
        if ((component_masks[eid] & required) != required || ac->state == 0) {
            sfx_channels[ch].entity_id = -1;
            continue;
        }

        /* Channel still playing previous buffer — skip */
        if (sceAudioGetChannelRestLen(sfx_channels[ch].psp_channel) > 0) continue;

        Audio_Asset* asset = &audio_assets[ac->sound_id];

        /* Reached end of sound */
        if (sfx_channels[ch].cursor >= asset->sample_count) {
            if (ac->loop) {
                sfx_channels[ch].cursor = 0;
            } else {
                ac->state = 0;
                sfx_channels[ch].entity_id = -1;
                continue;
            }
        }

        fill_and_submit(ch, ac);
    }

    /* 2. Start pending sounds */
    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & required) != required) continue;
        if (audio_components[i].state != 2) continue;

        /* Validate sound_id */
        if (audio_components[i].sound_id < 0 ||
            (uint32_t)audio_components[i].sound_id >= audio_asset_count ||
            audio_assets[audio_components[i].sound_id].samples == NULL) {
            audio_components[i].state = 0;
            continue;
        }

        int ch = find_free_channel();
        if (ch < 0) break; /* no free channels — remaining pending sounds wait */

        sfx_channels[ch].entity_id = (int)i;
        sfx_channels[ch].cursor = 0;
        audio_components[i].state = 1;

        fill_and_submit(ch, &audio_components[i]);
    }
}


void audio_cleanup(void) {
    for (int i = 0; i < MAX_SFX_CHANNELS; i++) {
        if (sfx_channels[i].psp_channel >= 0) {
            sceAudioChRelease(sfx_channels[i].psp_channel);
        }
        sfx_channels[i].entity_id = -1;
    }
}
