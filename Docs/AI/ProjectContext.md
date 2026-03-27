# Project Context: PSP 2D Game Engine

## 1. Project Overview & Goal
**Objective:** Build a 2D game engine targeting the PlayStation Portable (PSP) that is accessible to non-programmers. 
**Philosophy:** Keep it as simple as possible. Provide pre-built constraints ("Lego bricks") so users can build games visually without writing code.

## 2. Architecture Specification (Version 1.0)
The project is strictly divided into two distinct software applications:

### A. The Editor (Authoring Tool)
*   **Target Platform:** macOS primarily (Windows planned for later).
*   **Role:** A GUI application where the user places 2D objects, sets properties, and builds scenes visually.
*   **Output:** Generates a data file (JSON or YAML) containing the scene graph, entity definitions, and component parameters. There is **no C code generation or compiling** done by the Editor in V1.0.

## 3. The Data Bridge & ECS Architecture
*   **The Bridge:** The Editor outputs a single `scene.json` file. 
*   **Asset Manifest:** To achieve maximum performance, the JSON file includes an Asset Manifest at the top. The Editor maps file paths (e.g., `"hero.png"`) to integer IDs. The Engine pre-loads these into arrays.
*   **Entity-Component-System (ECS):** The JSON file defines an array of generic "Entities" (which are just integer IDs) and attaches "Components" (pure data structs like `Transform`, `Sprite`, `Collider`) to them. Components never contain strings; they use integer indices pointing to the Asset Manifest.
*   **Systems (C Code):** The engine does not have functions like `Walk(Actor)`. It has flat "Systems" (e.g., `void PhysicsSystem()`) that run over massive contiguous C arrays (`transforms[]`, `colliders[]`) every frame for maximum CPU Cache coherency.

## 4. Core Engine Components & Data Structures
The engine uses massive contiguous arrays for processing. Here are the core C structs defining the Components. Note that strings are deliberately omitted for performance:

```c
typedef struct { 
    float x; float y; int width; int height; 
} TransformComponent;

typedef struct { 
    int texture_index; // Index pointing to the JSON Asset Manifest
} SpriteComponent; 

typedef struct { 
    int is_solid; float* collision_vertices; 
} ColliderComponent;
```

Systems (like `physics_system()` and `render_system()`) iterate over these arrays and use math helpers (like `collision()` and `jump()`) to update the state each frame.

## 4. Future Stretch Goals (Not for V1.0)
The following are long-term improvements intentionally omitted from the V1.0 scope to maintain simplicity:
*   **Code Stripping / Dynamic Recompiling:** Moving away from a static pre-compiled engine to an Editor that custom-compiles the PSPSDK C code to save RAM and CPU overhead.
*   **Custom Scripting:** Allowing users to write custom game logic in C or an embedded scripting language like Lua.
*   **Function Calling Models:** Integrating AI/LLM models for logic generation or advanced function calling.

## 5. AI Assistant Instructions
When reading this file in a new conversation:
1.  **Acknowledge constraints:** Assume all solutions must fit within the severe hardware limits of the PSP (32MB RAM, MIPS R4000 processor, fixed-function `libgu` pipeline).
2.  **Maintain separation of concerns:** Never suggest that the Editor should directly execute PSP code. Always route data through the JSON/YAML bridge.
3.  **Optimize for C/C++:** When writing engine runtime code, use C or highly-optimized, no-RTTI/no-exceptions C++ suitable for the PSPSDK GCC toolchain.
