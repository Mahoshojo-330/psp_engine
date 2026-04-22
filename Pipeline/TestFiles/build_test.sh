#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p ../../Engine/build/scenes

echo "=== Compiling scene ==="
python3 ../magic_bridge.py test_scene.json ../../Engine/build/scenes/scene.bin

echo "=== Converting textures ==="
python3 ../texture_converter.py ./ ../../Engine/build/scenes/

echo "=== Converting audio ==="
python3 ../audio_converter.py ./ ../../Engine/build/scenes/

echo "=== Done ==="
