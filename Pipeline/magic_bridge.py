"""
magic_bridge.py — JSON scene to binary blob compiler

Reads a scene.json exported by the web editor and produces a binary blob
that the PSP engine can fread directly into its ECS arrays.

Binary format (all little-endian, matches PSP MIPS LE):
    [uint32  entity_count]
    [uint32  masks[entity_count]]
    [Transform_Component[entity_count]]   16 bytes each: float x, float y, int width, int height
    [Sprite_Component[entity_count]]       8 bytes each: int global_texture_id, uint32 colour_tint
    [Collider_Component[entity_count]]    20 bytes each: float offset_x, float offset_y, float width, float height, uint32 flags
    [Physics_Component[entity_count]]     16 bytes each: float vx, float vy, float gravity_magnitude, uint8 gravity_direction, 3 pad

Component bit assignments (must match Engine/src/core/ecs.h):
    COMP_ACTIVE    = 1 << 0
    COMP_TRANSFORM = 1 << 1
    COMP_SPRITE    = 1 << 2
    COMP_COLLIDER  = 1 << 3
    COMP_PHYSICS   = 1 << 4
    COMP_INPUT     = 1 << 5

Usage:
    python magic_bridge.py scene.json scene.bin
"""

import json
import struct
import sys


# Component bits — mirrors ecs.h enum
COMP_ACTIVE    = 1 << 0
COMP_TRANSFORM = 1 << 1
COMP_SPRITE    = 1 << 2
COMP_COLLIDER  = 1 << 3
COMP_PHYSICS   = 1 << 4
COMP_INPUT     = 1 << 5

MAX_ENTITIES = 256

# Struct pack formats (little-endian to match PSP MIPS LE)
FMT_TRANSFORM = '<ffii'    # x, y, width, height          = 16 bytes
FMT_SPRITE    = '<iI'      # global_texture_id, colour_tint = 8 bytes
FMT_COLLIDER  = '<ffffI'   # offset_x, offset_y, w, h, flags = 20 bytes
FMT_PHYSICS   = '<fffB3x'  # vx, vy, gravity_magnitude, gravity_direction + 3 pad = 16 bytes

ZERO_TRANSFORM = struct.pack(FMT_TRANSFORM, 0.0, 0.0, 0, 0)
ZERO_SPRITE    = struct.pack(FMT_SPRITE, 0, 0)
ZERO_COLLIDER  = struct.pack(FMT_COLLIDER, 0.0, 0.0, 0.0, 0.0, 0)
ZERO_PHYSICS   = struct.pack(FMT_PHYSICS, 0.0, 0.0, 0.0, 0)


def compile_scene(scene: dict) -> bytes:
    entities = scene["entities"]
    entity_count = len(entities)

    if entity_count > MAX_ENTITIES:
        print(f"Error: scene has {entity_count} entities, max is {MAX_ENTITIES}", file=sys.stderr)
        sys.exit(1)

    masks = []
    transform_data = []
    sprite_data = []
    collider_data = []
    physics_data = []

    for entity in entities:
        mask = COMP_ACTIVE  # all exported entities are active
        components = entity.get("components", {})

        # Transform
        if "transform" in components:
            mask |= COMP_TRANSFORM
            t = components["transform"]
            transform_data.append(struct.pack(
                FMT_TRANSFORM,
                float(t["x"]), float(t["y"]),
                int(t["width"]), int(t["height"])
            ))
        else:
            transform_data.append(ZERO_TRANSFORM)

        # Sprite
        if "sprite" in components:
            mask |= COMP_SPRITE
            s = components["sprite"]
            sprite_data.append(struct.pack(
                FMT_SPRITE,
                int(s["global_texture_id"]),
                int(s["colour_tint"])
            ))
        else:
            sprite_data.append(ZERO_SPRITE)

        # Collider
        if "collider" in components:
            mask |= COMP_COLLIDER
            c = components["collider"]
            collider_data.append(struct.pack(
                FMT_COLLIDER,
                float(c["offset_x"]), float(c["offset_y"]),
                float(c["width"]), float(c["height"]),
                int(c.get("flags", 0))
            ))
        else:
            collider_data.append(ZERO_COLLIDER)

        # Physics
        if "physics" in components:
            mask |= COMP_PHYSICS
            p = components["physics"]
            physics_data.append(struct.pack(
                FMT_PHYSICS,
                float(p.get("vx", 0.0)), float(p.get("vy", 0.0)),
                float(p.get("gravity_magnitude", 0.0)),
                int(p.get("gravity_direction", 0))
            ))
        else:
            physics_data.append(ZERO_PHYSICS)

        # Input (zero-size component, just a mask bit)
        if entity.get("player_controlled", False):
            mask |= COMP_INPUT

        masks.append(mask)

    # Build blob
    blob = bytearray()
    blob += struct.pack('<I', entity_count)
    for m in masks:
        blob += struct.pack('<I', m)
    for t in transform_data:
        blob += t
    for s in sprite_data:
        blob += s
    for c in collider_data:
        blob += c
    for p in physics_data:
        blob += p

    return bytes(blob)


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <scene.json> <output.bin>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, 'r') as f:
        scene = json.load(f)

    blob = compile_scene(scene)

    with open(output_path, 'wb') as f:
        f.write(blob)

    print(f"Compiled {input_path} -> {output_path} ({len(blob)} bytes)")


if __name__ == "__main__":
    main()
