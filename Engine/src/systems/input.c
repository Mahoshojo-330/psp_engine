#include <pspctrl.h>
#include "../core/ecs.h"

#define INPUT_MASK (COMP_ACTIVE | COMP_INPUT | COMP_PHYSICS)
#define PLAYER_SPEED 2.0f
#define ANALOG_DEAD_ZONE 30

static SceCtrlData pad;

void input_init(void) {
    sceCtrlSetSamplingCycle(0);
    sceCtrlSetSamplingMode(PSP_CTRL_MODE_ANALOG);
}

void input_system_update(void) {
    sceCtrlReadBufferPositive(&pad, 1);

    for (uint32_t i = 0; i < entity_count; i++) {
        if ((component_masks[i] & INPUT_MASK) != INPUT_MASK) continue;

        float vx = 0.0f;
        float vy = 0.0f;

        /* D-pad */
        if (pad.Buttons & PSP_CTRL_LEFT)  vx -= PLAYER_SPEED;
        if (pad.Buttons & PSP_CTRL_RIGHT) vx += PLAYER_SPEED;
        if (pad.Buttons & PSP_CTRL_UP)    vy -= PLAYER_SPEED;
        if (pad.Buttons & PSP_CTRL_DOWN)  vy += PLAYER_SPEED;

        /* Analog stick (center = 128, range 0-255) */
        int ax = (int)pad.Lx - 128;
        int ay = (int)pad.Ly - 128;
        if (ax > ANALOG_DEAD_ZONE || ax < -ANALOG_DEAD_ZONE)
            vx += (float)ax / 128.0f * PLAYER_SPEED;
        if (ay > ANALOG_DEAD_ZONE || ay < -ANALOG_DEAD_ZONE)
            vy += (float)ay / 128.0f * PLAYER_SPEED;

        physics[i].vx = vx;
        physics[i].vy = vy;
    }
}
