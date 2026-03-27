typedef struct
{
    float u, v;
    uint32_t colour;
    float x, y, z; 
} TextureVertex;

typedef struct
{
    int width, height;
    uint32_t * data;
} Texture;
