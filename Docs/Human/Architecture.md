# Architecture based on Requirement
Still the first version, so life's chill.

## Editor - simple web application
// this part is prolly gonna be handled by GEMINI.



## Bridge - JSON FILE
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


// higher level fuctions
jump();
fall_towards();
physics_system();
render_system();

```

### Planned Directory tree

``` 
Engine/
├── src/
│   ├── main.c               # Entry point, PSP initialization, and the Main Game Loop
│   ├── core/
│   │   ├── memory.c/h       # Static arrays, arena allocators
│   │   └── ecs.c/h          # Entity management (ID generation, component registry)
│   ├── components/          # Pure data structures (Transform, Sprite, Collider)
│   ├── systems/             # The logic that loops over components
│   │   ├── physics.c        # Updates Transforms based on Colliders
│   │   ├── render.c         # Pushes Sprite/Transform data to the PSP's libgu
│   │   └── audio.c          # Plays hardware audio channels
│   └── loaders/
│       ├── scene_parser.c   # Parses the binary scene file
│       └── asset_loader.c   # Loads textures/audio into the arrays defined in the Asset Manifest
├── include/                 # Public headers
├── vendor/                  # Third-party libs  
└── Makefile                 # Standard PSPSDK makefile

```

#### Fancy words
Arena refers to a large pre-allocated block of memory that you "carve" smaller peice out of. -> only use `malloc` ONCE! (fuck malloc, it's too slow)

orginal arena:  
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