/*
Include the following: 

Arena_Init
Arena_Alloc
Arena_Reset

Arena struct
*/

#ifndef CORE_MEMORY_H
#define CORE_MEMORY_H

#include <stddef.h>


typedef struct {
    unsigned char* buffer;  // Pointer to the start (one unsign char is one byte)
    size_t total_size;
    size_t offset;          // How much has been given out so far
} Arena;


/*
input: size_t total_size
output:

Notes:
*/
void Arena_Init(Arena* arena, size_t size);


/*
input: 
    pointer of arena
    size_t size to allocate
output: unsigned char* updated of where the data what written in

Notes: would return (something? or maybe print something) if overflow?
*/
unsigned char* Arena_Alloc(Arena* arena, size_t size);


/*
input: pointer of arena
output: void

Notes: set the offset of arena to 0
*/
void Arena_Reset(Arena* arena);

#endif