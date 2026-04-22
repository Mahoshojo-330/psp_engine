#include <pspkernel.h>
#include <pspdebug.h>
#include <pspdisplay.h>

#include "systems/systems.h"
#include "core/memory.h"
#include "loaders/asset_loader.h"

/* scene_parser.c — no header yet */
extern unsigned char* load_scene(Arena* arena, const char* path);
extern void parse_scene(unsigned char* bytes);

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

Arena arena;

int main(int argc, char** argv) {
    SetupCallbacks();
    Arena_Init(&arena, sceKernelTotalFreeMemSize());
    initGu();
    input_init();
    audio_init();

    /* Load scene and textures */
    unsigned char* scene_bytes = load_scene(&arena, "scenes/scene.bin");
    if (scene_bytes) {
        parse_scene(scene_bytes);
        load_scene_textures(&arena, "scenes");
        load_scene_audio(&arena, "scenes");
    }

    while(running) {
        input_system_update();
        physics_system_update();
        collision_system_update();
        audio_system_update();

        startFrame();
        render_system_update();
        endFrame();
    }

    audio_cleanup();
    endGu();
    sceKernelExitGame();
    return 0;
}
