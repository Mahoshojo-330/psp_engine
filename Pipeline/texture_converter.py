"""
texture_converter.py — Convert PNGs to .raw files for the PSP engine.

Output format (little-endian):
    [uint32 width]      padded to next power-of-2
    [uint32 height]     padded to next power-of-2
    [RGBA8888 pixels]   width * height * 4 bytes

Transparent pixels fill the padded region.

Usage:
    python texture_converter.py input.png output.raw
    python texture_converter.py sprites_dir/ output_dir/
        (batch mode: converts all PNGs, names output as tex_0.raw, tex_1.raw, ...)
"""

import struct
import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)


def next_power_of_2(n):
    """Round up to next power of 2."""
    if n <= 0:
        return 1
    n -= 1
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16
    return n + 1


def convert_png_to_raw(input_path, output_path):
    """Convert a single PNG to .raw format with power-of-2 padding."""
    img = Image.open(input_path).convert("RGBA")
    orig_w, orig_h = img.size

    pad_w = next_power_of_2(orig_w)
    pad_h = next_power_of_2(orig_h)

    # PSP max texture size is 512x512
    if pad_w > 512 or pad_h > 512:
        print(f"Warning: {input_path} pads to {pad_w}x{pad_h}, exceeds PSP 512x512 limit",
              file=sys.stderr)

    # Create padded image (transparent fill)
    if pad_w != orig_w or pad_h != orig_h:
        padded = Image.new("RGBA", (pad_w, pad_h), (0, 0, 0, 0))
        padded.paste(img, (0, 0))
        img = padded

    # Write .raw: header + pixels
    pixels = img.tobytes()  # RGBA order, row-major
    with open(output_path, "wb") as f:
        f.write(struct.pack("<II", pad_w, pad_h))
        f.write(pixels)

    print(f"  {input_path} ({orig_w}x{orig_h}) -> {output_path} ({pad_w}x{pad_h})")


def convert_directory(input_dir, output_dir):
    """Batch convert all PNGs in a directory to tex_0.raw, tex_1.raw, ..."""
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    pngs = sorted(input_dir.glob("*.png"))
    if not pngs:
        print(f"No PNGs found in {input_dir}", file=sys.stderr)
        sys.exit(1)

    for idx, png_path in enumerate(pngs):
        out_path = output_dir / f"tex_{idx}.raw"
        convert_png_to_raw(str(png_path), str(out_path))

    print(f"\nConverted {len(pngs)} textures to {output_dir}")


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.png> <output.raw>", file=sys.stderr)
        print(f"       {sys.argv[0]} <input_dir/> <output_dir/>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if os.path.isdir(input_path):
        convert_directory(input_path, output_path)
    else:
        convert_png_to_raw(input_path, output_path)


if __name__ == "__main__":
    main()
