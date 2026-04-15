# Design file
This file provides a simplest apporach for the product.
2D! Cuz 3D really sound like a pain in the ass. 

## Editor
You can move things in the GUI and after you moved anything, we pass that position / whatever info to the Engine.   

### How to pass the info? One may ask.
Not sure, but we'll find a way   
    -> json file  

### what's gonna be passed to the engine?
    1. what to render
    2. game logic

## Engine
This part is easy, 
    1. you parse the info (or the other ways, just understand the data, that's the most important part).   
    2. PREcompiled program that interpretes the data

### The code would include what you say?    
    1. renderer
    2. depackaged game logic 

### What logic to include?  
-> what are the common ones?  
    1. collision detector  
    2. dialogue related stuff  
    3. interation related stuff   
    4. road blocks (stuff that have solid volume)  
    4. gravity towards a certain defined point / direction  
    5. walk, jump, with defined speed / height  
    6. Sound  
    7. the layers of stuff (What to render first)


### Additional stuff
Audio  
Render related  


## Physics
    1. Velocity — each entity can have a speed in x and y (pixels per frame)
    2. Gravity — per-entity, configurable direction (down, up, left, right) and strength. Set to 0 for no gravity
    3. No collision yet — that's a separate step. Entities can overlap and fall off screen

### How it works
Physics component stores velocity and gravity. Each frame: gravity adds to velocity, velocity adds to position. That's it.

System execution order:
    1. Input (read controller, set velocity)
    2. Physics (apply gravity + velocity to position)
    3. Render (draw)

## Input
    1. One controller. PSP only has one
    2. No per-entity input data. An entity either responds to input or it doesn't — just a flag
    3. D-pad and analog stick set velocity on the entity's physics component
    4. Movement speed is hardcoded for now. No per-entity speed field until it's needed
    5. Button mapping is hardcoded. No configurable mapping until there's an action system to map to

### Why input needs physics
Input writes velocity. Physics reads velocity and moves the entity. Without physics, input has nowhere to write to.


# IMPROVEMENT
## Engine
Code Stripping + recompiling instead of using a static compiled engine -> also language support other than plain English
Open for user to add like they can import their own logic with C or Lua.
I'm thinking about allow using function calling models
For the rendering, improve effeciency by maybe using atlas instead of the current "read .raw files" 

## Editor
maybe


