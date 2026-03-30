#include <pspkernel.h>
#include <pspdebug.h>
#include <pspdisplay.h>

PSP_MODULE_INFO("PSP_Engine", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(THREAD_ATTR_USER | THREAD_ATTR_VFPU); // Use VFPU for physics!
PSP_HEAP_SIZE_KB(-1); // Grab all available RAM (24MB or 56MB depending on console)

int running = 1;

int exit_callback(int arg1, int arg2, void *common) {
    running = 0;
    return 0;
}
int CallbackThread(SceSize args, void *argp) {
    int cbid = sceKernelCreateCallback("Exit Callback", exit_callback, NULL);
    sceKernelRegisterExitCallback(cbid);
    sceKernelSleepThreadCB();
    return 0;
}
int SetupCallbacks(void) {
    int thid = sceKernelCreateThread("update_thread", CallbackThread, 0x11, 0xFA0, 0, 0);
    if(thid >= 0) {
        sceKernelStartThread(thid, 0, 0);
    }
    return thid;
}


// Tell main.c that this isolated function exists over in systems/render.c
extern void initGu();
extern void endGu();


int main(int argc, char** argv) {
    SetupCallbacks();
    initGu();
    
    while(running) {
        // [READ PLAYER INPUT HERE]
        
        // [PROCESS PHYSICS HERE]
        
        // [RENDER FRAME HERE]
        
        // Lock to the Screen's refresh rate (vsync) so we don't melt the CPU
        sceDisplayWaitVblankStart();
    }

    endGu();
    sceKernelExitGame();
    return 0;
}
