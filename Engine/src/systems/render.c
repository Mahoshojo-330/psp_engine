#include <pspkernel.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspgum.h>

#include "../../include/systems/render.h"
#include "../core/ecs.h"
#include "../loaders/asset_loader.h"

#define BUF_WIDTH 512
#define SCR_WIDTH 480
#define SCR_HEIGHT 272

// A memory list required by the PSP Graphics Engine to send drawing commands over the bus.
// It MUST be aligned to 16-bytes per MIPS hardware rules.
static unsigned int __attribute__((aligned(16))) list[262144];

// Untextured vertex: just colour + position. No UV needed for solid rects.
typedef struct {
    uint32_t colour;
    short x, y, z;
} ColourVertex;


void initGu() {
    sceGuInit();
    sceGuStart(GU_DIRECT, list);

    // Setting up the Hardware Render Buffers
    sceGuDrawBuffer(GU_PSM_8888, (void*)0, BUF_WIDTH);
    sceGuDispBuffer(SCR_WIDTH, SCR_HEIGHT, (void*)0x88000, BUF_WIDTH);
    sceGuDepthBuffer((void*)0x110000, BUF_WIDTH);

    sceGuOffset(2048 - (SCR_WIDTH / 2), 2048 - (SCR_HEIGHT / 2));
    sceGuViewport(2048, 2048, SCR_WIDTH, SCR_HEIGHT);
    sceGuDepthRange(65535, 0);

    // Defining the bounding box of the TV screen
    sceGuScissor(0, 0, SCR_WIDTH, SCR_HEIGHT);
    sceGuEnable(GU_SCISSOR_TEST);

    // Set default clear color to absolute Blue so we know it booted (ABGR format)
    sceGuClearColor(0xFFFF0000);
    sceGuClearDepth(0);
    sceGuClear(GU_COLOR_BUFFER_BIT | GU_DEPTH_BUFFER_BIT);
    sceGuFinish();
    sceGuSync(0, 0); // Wait for initialization to finish

    // FLIP THE TV SCREEN ON!
    sceGuDisplay(GU_TRUE);
}


void endGu(){
    sceGuDisplay(GU_FALSE);
    sceGuTerm();
}


void startFrame(){
    sceGuStart(GU_DIRECT, list);
    sceGuClear(GU_COLOR_BUFFER_BIT | GU_DEPTH_BUFFER_BIT);
}


void endFrame(){
    sceGuFinish();
    sceGuSync(0, 0);
    sceDisplayWaitVblankStart();
    sceGuSwapBuffers();
}


void render_system_update(){
    uint32_t required = COMP_ACTIVE | COMP_TRANSFORM | COMP_SPRITE;

    for (uint32_t i = 0; i < entity_count; i++){
        if ((component_masks[i] & required) != required) continue;

        int tex_id = sprites[i].global_texture_id;
        int has_texture = (tex_id >= 0 && tex_id < (int)texture_count
                          && textures[tex_id].data != NULL);

        if (has_texture) {
            Texture* tex = &textures[tex_id];

            sceGuEnable(GU_TEXTURE_2D);
            sceGuTexMode(GU_PSM_8888, 0, 0, 0);
            sceGuTexImage(0, tex->width, tex->height, tex->width, tex->data);
            sceGuTexFunc(GU_TFX_MODULATE, GU_TCC_RGBA);
            sceGuTexFilter(GU_NEAREST, GU_NEAREST);

            TextureVertex* verts = sceGuGetMemory(2 * sizeof(TextureVertex));

            verts[0].u = 0.0f;
            verts[0].v = 0.0f;
            verts[0].colour = sprites[i].colour_tint;
            verts[0].x = transforms[i].x;
            verts[0].y = transforms[i].y;
            verts[0].z = 0.0f;

            verts[1].u = (float)tex->width;
            verts[1].v = (float)tex->height;
            verts[1].colour = sprites[i].colour_tint;
            verts[1].x = transforms[i].x + (float)transforms[i].width;
            verts[1].y = transforms[i].y + (float)transforms[i].height;
            verts[1].z = 0.0f;

            sceGumDrawArray(GU_SPRITES,
                GU_TEXTURE_32BITF | GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D,
                2, 0, verts);

            sceGuDisable(GU_TEXTURE_2D);
        } else {
            ColourVertex* verts = sceGuGetMemory(2 * sizeof(ColourVertex));

            verts[0].colour = sprites[i].colour_tint;
            verts[0].x = (short)transforms[i].x;
            verts[0].y = (short)transforms[i].y;
            verts[0].z = 0;

            verts[1].colour = sprites[i].colour_tint;
            verts[1].x = (short)(transforms[i].x + transforms[i].width);
            verts[1].y = (short)(transforms[i].y + transforms[i].height);
            verts[1].z = 0;

            sceGumDrawArray(GU_SPRITES,
                GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D,
                2, 0, verts);
        }
    }
}


