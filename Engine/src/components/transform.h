/*
transforms refers to the POSITION of the thing 
WHERE to render if there's anything to be rendered
*/

#ifndef COMPONENTS_TRANSFORM_H
#define COMPONENTS_TRANSFORM_H

// 16 bytes
typedef struct{
    float x, y;
    int width, height;
} Transform_Component;

#endif