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


# IMPROVEMENT
## Engine
Code Stripping + recompiling instead of using a static compiled engine -> also language support other than plain English
Open for user to add like they can import their own logic with C or Lua.
I'm thinking about allow using function calling models

## Editor
maybe



# FINAL PRODUCT

# ROAD MAP
 -> M1 is xxxx
    based on M1, derive the architecture (M1 being Minimum Viable Product)