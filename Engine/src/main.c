#include <pspkernel.h>
#include <pspdebug.h>
#include <pspdisplay.h>

// Step 1: PSP Firmware Requirements
PSP_MODULE_INFO("PSP_Engine", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(THREAD_ATTR_USER | THREAD_ATTR_VFPU); // Use VFPU for physics!
PSP_HEAP_SIZE_KB(-1); // Grab all available RAM (24MB or 56MB depending on console)

// Global flag determining whether the engine should keep running
int running = 1;

// Step 2: The Exit Callback Thread
// This function tells the engine to stop when the HOME button is pressed
int exit_callback(int arg1, int arg2, void *common) {
    running = 0;
    return 0;
}

// Registers the callback with the OS
int CallbackThread(SceSize args, void *argp) {
    int cbid = sceKernelCreateCallback("Exit Callback", exit_callback, NULL);
    sceKernelRegisterExitCallback(cbid);
    sceKernelSleepThreadCB();
    return 0;
}

// Boots up the background thread that listens for the HOME button
int SetupCallbacks(void) {
    int thid = sceKernelCreateThread("update_thread", CallbackThread, 0x11, 0xFA0, 0, 0);
    if(thid >= 0) {
        sceKernelStartThread(thid, 0, 0);
    }
    return thid;
}


// Tell main.c that this isolated function exists over in systems/render.c
extern void RenderSystem_Init();

// Step 3 & 4: The Main Execution Loop
int main(int argc, char** argv) {
    // 1. Boot up the Home Button listener
    SetupCallbacks();
    
    // 2. Turn on the graphics processor and clear the screen
    RenderSystem_Init();
    
    // 3. The Infinite Game Engine Loop
    while(running) {
        // [READ PLAYER INPUT HERE]
        
        // [PROCESS PHYSICS HERE]
        
        // [RENDER FRAME HERE]
        
        // Lock to the Screen's refresh rate (vsync) so we don't melt the CPU
        sceDisplayWaitVblankStart();
    }
    
    // If we break out of the loop, close the game gracefully back to the XMB menu
    sceKernelExitGame();
    return 0;
}
