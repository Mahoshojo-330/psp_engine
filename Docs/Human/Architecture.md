# Architecture based on Requirement
Still the first version, so life's chill.
ADD the documentation into rules (or stuff like that)

## Editor - simple web application
// this part is prolly gonna be handled by GEMINI.
A web application that include "generating JSON file" and "generating binary file based on the JSON file"
-> you can choose which one to export as


### Bridge - JSON FILE
For here, those characters and objects are called actors cuz I don't know the general names for them.

Can rename everything later.

```
Things that may need to be passed: 
    string:     variable_name   
    string:     display_name   
    string:     texture_path   
    int[2]:     size (the vertexes for rendering)   
    int[2]:     vertecies (for calculating collisions)   
    boolean:    is_solid    // not sure about this..this is like the object that movable    characters can't move onto you know


Actions allowed to be call:   
    Draw(Actor) // the is_solid can also be moved here prolly   
    Jump (Actor, height) // maybe more restraints?   
    Walk (Actor, speed)   
    Detect_collision(Actor) // ? so they can interact with other objects? not sure   
    Play_sounds(sound_path, boolean: loop) -> register thread? get a thread to handle each sound playing loop sounds too expensive   
    Stop_playing_sound(sound_identifier)   
```

```json

{
  "entities": [
    {
      "id": 1,
      "display_name": "Hero",
      "components": {
        "Transform": { 
          "x": 10, "y": 20, "width": 32, "height": 32 
        },
        "SpriteRenderer": { 
          "texture_path": "player.png" 
        },
        "PlayerController": { 
          "walk_speed": 5, "jump_height": 10 
        },
        "Collider": { 
          "is_solid": true 
        }
      }
    },
    {
      "id": 2,
      "display_name": "Background Music Player",
      "components": {
        "AudioSource": {
          "sound_path": "level1.wav",
          "loop": true
        }
      }
    }
  ]
}
```

### PROCESSING THE DATA
Write a script to compile the json file into binary files and let the psp engine fread() the binary blob directly into the arrays in one operation.
With python

## Engine - C and static
As the job over here is to provide the "lego bricks" that games can be built upon of, we can split different attributes into different "components".
Data storage components includes: **DisplayComponent, AudioComponent, ColliderComponent, MovingComponent** (maybe the display component is a bit ovelapping with the movign components?)

```c
typedef struct {
    float x;
    float y;
    int width;
    int height;
} TransformComponent;

typedef struct {
    int texture_index;
    // the display related stuff
} SpriteComponent; 

typedef struct {
    int is_solid;
    float* collosion_vertecies;
} ColliderComponent;

// for component_id, make it like pass more information?

```

And there's also the functions that can be applied to the components:

```c
/*
input: int* component_id
  Essentially a list of stuff that should check for collision
output: boolean of whether the items in this list collides

Notes: Does not really change anything
*/
boolean collision(int* component_ids);


/*
input: component_id
output: void

Notes: display based on the component_id
*/
displayDialogue(int component_id);

/*
input:
output:

Notes:
*/
moveItem(int* component_id);

/*
input:
output:

Notes:
*/
play_sounds(int* component_id);


/*
input:
output:

Notes:
*/
Stop_playing_sound(int sound_identifier);


// higher level functions

/*
Physics system — runs every frame.
Applies gravity to velocity, then velocity to position.
Only touches entities with COMP_ACTIVE | COMP_PHYSICS | COMP_TRANSFORM.
*/
physics_system_update();

/*
Input system — runs every frame, before physics.
Reads controller once (sceCtrlReadBufferPositive).
Writes velocity to entities with COMP_ACTIVE | COMP_INPUT | COMP_PHYSICS.
No per-entity config. One controller, one set of hardcoded bindings.
*/
input_system_update();

render_system_update();

```

### Directory tree

```text
Engine/
├── Makefile
├── include/
│   └── systems/
│       └── render.h
└── src/
    ├── main.c                  # Entry point, PSP init, main loop
    ├── components/             # Pure data structs, no logic
    │   ├── audio.h
    │   ├── collider.h
    │   ├── physics.h
    │   ├── player_controlled.h
    │   ├── sprite.h
    │   └── transform.h
    ├── core/
    │   ├── ecs.c / ecs.h       # Entity IDs, component masks, parallel arrays
    │   └── memory.c / memory.h # Arena allocator
    ├── loaders/
    │   ├── asset_loader.c / .h # Textures into RAM/VRAM
    │   └── scene_parser.c      # Binary blob into ECS arrays
    └── systems/
        ├── systems.h           # Shared system headers
        ├── audio.c             # Audio playback
        ├── physics.c           # Velocity + gravity each frame
        └── render.c            # Draw via libgu/libgum
```

Build output
```text
build/
├── EBOOT.PBP
├── scenes/
│   ├── scene.bin
│   └── tex_*.raw
└── src/                        # .o files
```

### Key Technical Concepts

#### Memory Arenas (Linear Allocation)
An **Arena Allocator** is a technique to avoid the slow performance and fragmentation of calling standard `malloc()` and `free()` repeatedly during gameplay. 

Instead of asking the OS for memory every time we need it, we allocate one massive block (an "arena") at engine startup. We then distribute chunks of this block by simply moving an offset pointer forward.

*Example:*
1. **Initial State:** Arena of 100 bytes is empty. Offset = 0.
   `[---------------------------------------------] (100 bytes)`  
`^ offset = 0`

Add some data:  
   `[Transform (16b) |----------------------------] (100 bytes)`    
`^ offset = 16`

Add some more data, it'll look like this:  
   `[Transform (16b) | Sprite (4b) |--------------] (100 bytes)`    
`^ offset = 20`

The offset is being kept manually.

### THINGS TO KEEP IN MIND THAT I HAVE NO CLUE HOW TO APPROACH RN  

#### Asset Loading & Memory Management will blow up
Pack all assets into a virtually mounted archive file (like a .zip or a custom .pak). For audio, stream background music directly from the disc (.at3 or mp3) via a separate thread, rather than loading it all into memory. Only load small sound effects into RAM.

#### Naïve ECS Mapping
Sparse Sets or Archetypes. If that is too complex for V1.0, at least maintain a dense array of active components and map them back to the Entity ID, rather than using the Entity ID as the direct array index.

#### Collision Detection
Prolly only check around the certain entity

#### Variable Timestep Physics (There's pros and cons)
// LOCK TO 30fps or something
decoupling physics speed from the framerate ?entirely (?) MAYBE NOT A GOOD IDEA
Anyhow, maybe?

#### Texture loading pipeline
The Editor needs an "Asset Pipeline" that converts .png images into raw uncompressed pixel data (.raw or .tim2) during the build/export phase. Even better, it should pre-swizzle the textures (a PSP hardware feature to optimize GPU cache). The engine should just fread() that raw binary chunk straight into VRAM or Main RAM and draw it. No decompression on the PSP needed.
