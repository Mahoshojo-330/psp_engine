#include <stddef.h>
#include <stdlib.h>

#include "memory.h"


/*
input: size_t total_size
output:

Notes:
*/
void Arena_Init(Arena* arena, size_t total_size){
    arena -> buffer = malloc(total_size);
    arena -> offset = 0;
    arena -> total_size = total_size;
}


/*
input: 
    pointer of arena
    size_t size to allocate
output: unsigned char* updated of where the data can be write to

Notes: 
    would return NULL if overflow
    RAM ALLIGN 8 byte 
*/
unsigned char* Arena_Alloc(Arena* arena, size_t size){
    if ((arena -> offset) + size > (arena -> total_size)){
        return NULL;
    }
    unsigned char* ret = (arena -> buffer) + (arena -> offset);
    arena -> offset += (size + 7) & ~7;

    return ret;
}


/*
input: pointer of arena
output: void

Notes: set the offset of arena to 0
*/
void Arena_Reset(Arena* arena){
    arena -> offset = 0;
}