# Design file v2
This is a refined design file, work as a replacement of v1 design file, which is deleted.  
The project is splitted into 2 parts, a Web Application working as a json `Editor` (and data compiler) and the `Engine` that's gonna run on the PSP.

##

# Editor
The editor is a web application that integerates the following components:
- translating user input into json files
- translating the user input files into derectly usable files, currently:
```
    json    ->  bin
    png     ->  raw
    wav     ->  raw
```
- The translation should be changed into atlas later.
##

# Engine
The engine is written with PSPSDK and contains the following components:
- Parse the data and based on the data, only compile the called features 
- Load (store) the data in ram in an **effecient** way
- Effective collision detector  
- Interation/scene evoking
- A complete physics system
- Effecient Rendering System -> only re-render what's been changed maybe?
- Customed key-mapping (like the user should be able to customize the key bindings in the json file)

## Current version
The following is a list of requirements being fulfilled by the current version of the Engine.

- basic rendering
- basic collision detection
- basic audio system
- naive arena / memory system
- hard-coded control method


THE FOLLOWING IS WRITTEN BY CLAUDE
-

# Physics (current, in detail)
Concrete rules behind the "complete physics system" bullet above.

- Velocity — each entity can have a speed in x and y (pixels per frame)
- Gravity — per-entity, configurable direction (down, up, left, right) and magnitude. Set magnitude to 0 for no gravity
- Each frame: gravity adds to velocity, velocity adds to position. No friction, no max speed
- No fixed timestep — physics runs once per vsync-locked frame

System execution order:
1. Input (read controller, set velocity)
2. Physics (apply gravity + velocity to position)
3. Collision (resolve overlaps via min-penetration push-apart)
4. Audio (service channels, start pending sounds)
5. Render (draw)

##

# Input (current, in detail)
Clarifies the "hard-coded control method" bullet above. The "Customed key-mapping" item under Engine is a **future goal**, not the current state.

- One controller. PSP only has one
- No per-entity input data. An entity either responds to input or it doesn't — just a flag (`player_controlled`)
- D-pad and analog stick set velocity on the entity's physics component
- Movement speed is hardcoded for now. No per-entity speed field until it's needed
- Button mapping is hardcoded. No configurable mapping until there's an action system to map to
- All `player_controlled` entities receive the same input every frame — they all move together

### Why input needs physics
Input writes velocity. Physics reads velocity and moves the entity. Without physics, input has nowhere to write to.

##

# Not yet implemented
Common game-logic features the engine does not have yet, captured here so they're not forgotten:

- Dialogue evoke + display
- Element interactions (entity-vs-entity scripted reactions)
- Road blocks beyond the basic AABB collider (solid-volume composites, one-way platforms, slopes, triggers)
- Gravity towards a defined point (radial / gravity well), in addition to the cardinal-direction gravity that exists
- Render layers — explicit z-order / "what to render first". Currently draw order = entity order
- Scene transitions and scene-evoking events (only one scene is loaded at boot)
- BGM streaming (audio channel 0 is reserved but unused)
- Runtime entity spawn / destroy
- Camera, sprite rotation, sprite scale, animation
- User-configurable key bindings (the "Customed key-mapping" goal listed under Engine)

##

# IMPROVEMENT
Long-term ideas for later versions.

## Engine
- Code stripping + recompiling instead of using a static compiled engine — also language support other than plain English
- Open for user to add their own logic with C or Lua
- Thinking about allowing function-calling models
- For the rendering, improve efficiency by using a texture atlas instead of the current "read .raw files" approach
