#!/usr/bin/env python3
"""Check a hero image against the house style in SKILL.md.

Usage: python3 check-image.py <image.png> [...]

Verifies the palette, aspect ratio, and background flatness that the STYLE block
asks for. Reads PNG with the standard library only, so it needs no dependencies;
pass an already-decoded RGB/RGBA PNG (what image generators emit).

Exits non-zero if any image fails a hard check.
"""
import struct
import sys
import zlib
from collections import Counter

BACKGROUND = (0xFA, 0xF6, 0xEC)
GOLD = (0xD4, 0x94, 0x23)
BROWN = (0x42, 0x30, 0x1D)
FORBIDDEN = {
    'neon green': (0x39, 0xFF, 0x14),
    'bright red': (0xFF, 0x00, 0x00),
    'blue': (0x1E, 0x6F, 0xE0),
    'purple': (0x8B, 0x2B, 0xE2),
}


def load_rgb(path):
    """Decode a non-interlaced 8-bit PNG to a flat list of RGB tuples."""
    data = open(path, 'rb').read()
    pos, idat, width, height, colour_type = 8, b'', None, None, None
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        chunk_type = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if chunk_type == b'IHDR':
            width, height, depth, colour_type = struct.unpack('>IIBB', chunk[:10])
            if depth != 8 or colour_type not in (2, 6):
                raise SystemExit(f'{path}: need an 8-bit RGB/RGBA PNG')
        elif chunk_type == b'IDAT':
            idat += chunk
        pos += 12 + length

    channels = 3 if colour_type == 2 else 4
    stride = width * channels
    raw = zlib.decompress(idat)
    out, previous, i = bytearray(), bytearray(stride), 0
    for _ in range(height):
        filter_type, i = raw[i], i + 1
        line, i = bytearray(raw[i:i + stride]), i + stride
        for x in range(stride):
            left = line[x - channels] if x >= channels else 0
            up = previous[x]
            up_left = previous[x - channels] if x >= channels else 0
            if filter_type == 1:
                line[x] = (line[x] + left) & 255
            elif filter_type == 2:
                line[x] = (line[x] + up) & 255
            elif filter_type == 3:
                line[x] = (line[x] + (left + up) // 2) & 255
            elif filter_type == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                predictor = left if (pa <= pb and pa <= pc) else (up if pb <= pc else up_left)
                line[x] = (line[x] + predictor) & 255
        out += line
        previous = line
    pixels = [tuple(out[j:j + 3]) for j in range(0, len(out), channels)]
    return pixels, width, height


def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def share_near(pixels, target, tolerance):
    return sum(1 for p in pixels if distance(p, target) < tolerance) / len(pixels)


def check(path):
    pixels, width, height = load_rgb(path)
    dominant = Counter(pixels).most_common(1)[0][0]
    ratio = width / height
    failures = []

    print(f'{path}  {width}x{height}')

    ok = abs(ratio - 16 / 9) < 0.06
    print(f'  aspect ratio      {ratio:.2f}  {"ok" if ok else "FAIL — want 16:9 (1.78)"}')
    failures += [] if ok else ['aspect ratio']

    drift = distance(dominant, BACKGROUND)
    ok = drift < 12
    print(f'  background        #{dominant[0]:02x}{dominant[1]:02x}{dominant[2]:02x}'
          f'  drift {drift:.1f}  {"ok" if ok else "FAIL — want #faf6ec"}')
    failures += [] if ok else ['background']

    # A flat background means the dominant colour holds most of the canvas.
    flat = share_near(pixels, dominant, 6)
    ok = flat > 0.40
    print(f'  background flat   {flat:.0%} within 6 of dominant  '
          f'{"ok" if ok else "FAIL — looks like a gradient or vignette"}')
    failures += [] if ok else ['flat background']

    gold = share_near(pixels, GOLD, 40)
    ok = 0.001 < gold < 0.10
    print(f'  gold accent       {gold:.2%}  {"ok" if ok else "FAIL — want a sparing 0.1–10%"}')
    failures += [] if ok else ['gold accent']

    darkest = Counter(sorted(pixels, key=sum)[:200]).most_common(1)[0][0]
    ok = distance(darkest, BROWN) < 70
    print(f'  darkest tone      #{darkest[0]:02x}{darkest[1]:02x}{darkest[2]:02x}'
          f'  {"ok" if ok else "warn — expected a warm brown near #42301d"}')

    for name, colour in FORBIDDEN.items():
        hits = share_near(pixels, colour, 60)
        if hits > 0.002:
            print(f'  forbidden {name:<11} {hits:.2%}  FAIL — palette forbids this')
            failures.append(name)

    print(f'  => {"PASS" if not failures else "FAIL: " + ", ".join(failures)}\n')
    return not failures


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if all(results) else 1)
