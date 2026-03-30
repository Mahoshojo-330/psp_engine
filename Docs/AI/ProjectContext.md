# Project Context: PSP 2D Game Engine

## 1. Project Overview & Goal
**Objective:** Build a 2D game engine targeting the PlayStation Portable (PSP) that is accessible to non-programmers. 
**Philosophy:** Keep it as simple as possible. Provide pre-built constraints ("Lego bricks") so users can build games visually without writing code.

## 2. Architecture Specification (Version 1.0)
The project is divided into an authoring tool pipeline and the static C-based PSP engine.

### A. The Editor & Pipeline
*   **Editor:** A simple web application where users place 2D objects (Actors/Entities), set properties, and build scenes visually.
*   **Output:** Generates a `scene.json` file.
*   **Data Compiler:** A Python script compiles the JSON file into a binary blob.
*   **Bridge:** The PSP engine will `fread()` the binary blob directly into the C arrays in one operation for maximum performance.

## 3. The Data Bridge & ECS Architecture
*   **Entity-Component-System (ECS):** The JSON/Binary defines an array of "Entities" (integer IDs) with attached pure data "Components" (`TransformComponent`, `SpriteComponent`, `ColliderComponent`, `AudioComponent`, etc.).
*   **Asset Manifest:** To achieve maximum performance, file paths are mapped to integer IDs/indices during the compile phase. The engine pre-loads textures and audio based on this manifest.
*   **Systems (C Code):** "Systems" (e.g., `physics_system()`, `render_system()`) act on the dense component arrays rather than passing objects around.

## 4. Core Engine Design
### Directory Structure Pattern
The engine follows a strict structure: `core/` (memory, ecs), `systems/` (physics, render, audio), and `loaders/` (parsing the binary blob and loading assets).

### Memory & Asset Management
*   **Memory Arenas:** The engine uses linear allocation (Arena Allocators) applied at engine startup to avoid slow `malloc()`/`free()` fragmentation during gameplay.
*   **ECS Mapping:** Uses dense arrays of active components mapping back to Entity IDs (Sparse Sets or Archetypes planned).
*   **Asset Pipeline:** The python compiler will pre-swizzle textures and export to raw uncompressed formats (`.raw` or `.tim2`) for the PSP to read directly into VRAM without decompression.
*   **Audio:** Long background tracks stream directly from disc in a separate thread, while small sound effects are loaded into RAM.

## 5. Future Stretch Goals (Not for V1.0)
*   **Code Stripping / Dynamic Recompiling:** Moving to custom-compiling PSPSDK C code to save RAM.
*   **Custom Scripting:** Allowing logic in C or embedded Lua.
*   **Variable Timestep:** Decoupling physics from framerate, though locking to 30fps is the robust short-term plan.

## 6. AI Assistant Instructions
1.  **Acknowledge constraints:** Assume all solutions must fit within the severe hardware limits of the PSP (32MB RAM, MIPS R4000 processor, fixed-function `libgu` pipeline).
2.  **Maintain separation of concerns:** The Editor (Web App) and data pipelining (Python) are completely separate from the Engine (C/PSPSDK).
3.  **Optimize for C/C++:** Keep it flat and data-oriented. Use contiguous structures. Avoid pointer chasing where possible. Use custom memory arenas over standard allocation.
4.  **Challenger Mindset:** DO NOT agree with the user blindly. ALWAYS reply with the best approach possible based on my engineering expertise.
5.  **Hands off Human Docs:** DO NOT make changes in the `Docs/Human/` folder unless being deliberately told to do so.
6.  **Explicit Coding Only:** DO NOT write any code except when explicitly told to do so, EXCEPT for making changes to the AI folder.
