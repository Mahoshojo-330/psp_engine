#ifndef SYSTEMS_H
#define SYSTEMS_H

// --- Render System ---
void initGu(void);
void endGu(void);
void startFrame(void);
void endFrame(void);
void render_system_update(void);


// --- Input System ---
void input_init(void);
void input_system_update(void);

// --- Physics System ---
void physics_system_update(void);


// --- Audio System ---
// void audio_system_update(void);

#endif
