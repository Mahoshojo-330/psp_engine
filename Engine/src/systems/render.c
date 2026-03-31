#include <pspkernel.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspgum.h>

#include "../../include/systems/render.h"

#define BUF_WIDTH 512
#define SCR_WIDTH 480
#define SCR_HEIGHT 272

// A memory list required by the PSP Graphics Engine to send drawing commands over the bus.
// It MUST be aligned to 16-bytes per MIPS hardware rules.
static unsigned int __attribute__((aligned(16))) list[262144];

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


