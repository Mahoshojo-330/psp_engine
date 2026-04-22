"""
audio_converter.py — WAV to .raw PCM converter for PSP engine

Converts .wav files to the engine's audio .raw format:
    [uint32 sample_count]
    [uint32 sample_rate]
    [uint16 channels]       (1=mono, 2=stereo)
    [uint16 padding]
    [int16  pcm_data...]    sample_count * channels * 2 bytes

Usage:
    Single file:    python audio_converter.py input.wav output.raw
    Batch mode:     python audio_converter.py input_dir/ output_dir/

In batch mode, converts all .wav files to sfx_{N}.raw where N is
derived from the filename (e.g., sfx_0.wav -> sfx_0.raw).
Files not matching sfx_N.wav pattern are skipped with a warning.
"""

import struct
import sys
import os
import wave
import re


def convert_wav(input_path: str, output_path: str, force_mono: bool = True) -> None:
    with wave.open(input_path, 'rb') as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)

    if sample_width != 2:
        raise ValueError(
            f"{input_path}: expected 16-bit PCM, got {sample_width * 8}-bit. "
            f"Convert to 16-bit WAV first."
        )

    # Downmix stereo to mono if requested
    if channels == 2 and force_mono:
        samples = struct.unpack(f'<{n_frames * 2}h', raw_data)
        mono = []
        for i in range(0, len(samples), 2):
            mono.append((samples[i] + samples[i + 1]) // 2)
        raw_data = struct.pack(f'<{n_frames}h', *mono)
        channels = 1

    sample_count = n_frames

    with open(output_path, 'wb') as f:
        # Header: sample_count(4) + sample_rate(4) + channels(2) + padding(2) = 12 bytes
        f.write(struct.pack('<I', sample_count))
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<HH', channels, 0))
        f.write(raw_data)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"  {os.path.basename(input_path)} -> {os.path.basename(output_path)} "
          f"({sample_count} samples, {sample_rate}Hz, {'mono' if channels == 1 else 'stereo'}, "
          f"{size_kb:.1f}KB)")


def batch_convert(input_dir: str, output_dir: str) -> None:
    pattern = re.compile(r'^sfx_(\d+)\.wav$')
    converted = 0

    for filename in sorted(os.listdir(input_dir)):
        match = pattern.match(filename)
        if not match:
            if filename.endswith('.wav'):
                print(f"  Skipping {filename} (doesn't match sfx_N.wav pattern)")
            continue

        input_path = os.path.join(input_dir, filename)
        output_name = f"sfx_{match.group(1)}.raw"
        output_path = os.path.join(output_dir, output_name)
        convert_wav(input_path, output_path)
        converted += 1

    if converted == 0:
        print("  No sfx_N.wav files found.")


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.wav|input_dir> <output.raw|output_dir>",
              file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if os.path.isdir(input_path):
        os.makedirs(output_path, exist_ok=True)
        batch_convert(input_path, output_path)
    else:
        convert_wav(input_path, output_path)


if __name__ == "__main__":
    main()
