
### Dynamic Headroom

Instead of hardcoding a massive max limit forever, you tell your Arena to create a custom-sized array just for the current level. 

**How it works:**
1. **Peek the File:** Open the binary file and read *only* the first 4 bytes to get the `entity_count` (e.g., 50 entities).
2. **Add Headroom:** Add the maximum number of dynamic objects you expect for that specific level (e.g., 50 file entities + 100 slots for bullets/particles = 150 total slots).
3. **Allocate on Arena:** Push enough memory onto the Arena for exactly 150 entities. 
4. **Point and Read:** Point your ECS pointers (`Transform_Component*`, etc.) to this new memory block. Read the rest of the file directly into the start of the block.

**Why this is the best:**
* The first 50 slots are instantly filled with your level data (Zero-Copy).
* The next 100 slots are perfectly empty and waiting for your ECS to spawn bullets into them.
* When the level ends, the Arena resets, and you get 100% of that RAM back.