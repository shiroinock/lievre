"""Bakes worn glyphs into a renamed copy of IBM Plex Sans JP and the KEI Mono Latin files.

Every outline point moves along a smooth noise field seeded by hash(salt + 'glyph' + glyph name),
so each glyph keeps the same wobble for a given salt, for Japanese and Latin alike. The files keep
the Google Fonts unicode-range split from @fontsource, so a page loads only the slices it uses.

IBM Plex is licensed under the SIL OFL 1.1 with the Reserved Font Name "Plex": the modified fonts
must not carry that name, so they are published as "KEI Worn Sans" and "KEI Worn Mono".

Usage: python3 scripts/wear/font.py <salt> <out-dir> [weights...]
Requires fontTools and brotli (pip install fonttools brotli).
"""

import json
import os
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram

MASK = 0xFFFFFFFF
SANS = Path('node_modules/@fontsource/ibm-plex-sans-jp')
MONO = Path('node_modules/@fontsource/ibm-plex-mono')

# Font units (1000 per em). 16px text moves by at most about 0.45px; 44px display by about 1.2px.
AMPLITUDE = float(os.environ.get('KEI_WEAR_AMPLITUDE', 28))
WAVELENGTH = float(os.environ.get('KEI_WEAR_WAVELENGTH', 110))


def imul(a, b):
    return (a * b) & MASK


def hash_string(text):
    h = 0x811C9DC5
    for byte in text.encode('utf-8'):
        h ^= byte
        h = imul(h, 0x01000193)
    return h


def seed_for(salt, kind, ident=''):
    return hash_string(f'{salt}:{kind}:{ident}')


def hash32(seed, x, y):
    h = (seed ^ imul(x & MASK, 0x27D4EB2D) ^ imul(y & MASK, 0x165667B1)) & MASK
    h ^= h >> 16
    h = imul(h, 0x7FEB352D)
    h ^= h >> 15
    h = imul(h, 0x846CA68B)
    h ^= h >> 16
    return h / 4294967296


def noise2(seed, x, y):
    x0, y0 = int(x // 1), int(y // 1)
    fx, fy = x - x0, y - y0
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = hash32(seed, x0, y0), hash32(seed, x0 + 1, y0)
    c, d = hash32(seed, x0, y0 + 1), hash32(seed, x0 + 1, y0 + 1)
    top = a + (b - a) * sx
    bottom = c + (d - c) * sx
    return top + (bottom - top) * sy


def wear_glyphs(font, salt):
    glyf = font['glyf']
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        if hasattr(glyph, 'program'):
            glyph.program = ttProgram.Program()
            glyph.program.fromBytecode(b'')
        if glyph.isComposite() or glyph.numberOfContours <= 0:
            continue
        seed = seed_for(salt, 'glyph', name)
        sx, sy = seed ^ 0x9E3779B9, seed ^ 0x85EBCA6B
        coords = glyph.coordinates
        for i, (x, y) in enumerate(coords):
            u, v = x / WAVELENGTH, y / WAVELENGTH
            dx = noise2(sx, u, v) - 0.5 + (noise2(sx, u * 3, v * 3) - 0.5) * 0.35
            dy = noise2(sy, u, v) - 0.5 + (noise2(sy, u * 3, v * 3) - 0.5) * 0.35
            coords[i] = (round(x + dx * 2 * AMPLITUDE), round(y + dy * 2 * AMPLITUDE))
        glyph.recalcBounds(glyf)
    # Moved outlines no longer match the hinting programs.
    for table in ('fpgm', 'prep', 'cvt '):
        if table in font:
            del font[table]


def rename(font, family):
    postscript = family.replace(' ', '')
    for record in font['name'].names:
        if record.nameID in (1, 16):
            record.string = family
        elif record.nameID == 3:
            record.string = f'{postscript};KEI wear'
        elif record.nameID in (4, 18):
            record.string = re.sub(r'IBM Plex (Sans JP|Mono)', family, record.toUnicode())
        elif record.nameID == 6:
            record.string = re.sub(r'IBMPlex(SansJP|Mono)', postscript, record.toUnicode())
    assert not any('Plex' in r.toUnicode() for r in font['name'].names if r.nameID != 0)


def faces(css_path, family_from, family_to, out_prefix):
    css = css_path.read_text()
    for block in re.findall(r'@font-face \{.*?\}', css, re.S):
        if 'woff2' not in block:
            continue
        source = re.search(r"url\(\./files/([^)]+\.woff2)\)", block).group(1)
        yield source, (
            block.replace(f"'{family_from}'", f"'{family_to}'")
            .replace(f'./files/{source}', f'{out_prefix}{source}')
            .replace(" url(./files/" + source.replace('.woff2', '.woff') + ") format('woff'),", '')
        )


def main():
    salt, out = sys.argv[1], Path(sys.argv[2])
    weights = sys.argv[3:] or ['400', '500', '600']
    out.mkdir(parents=True, exist_ok=True)
    blocks, report = [], {'salt': salt, 'files': 0, 'bytes': 0}
    jobs = []
    for weight in weights:
        jobs += [(SANS, f'{weight}.css', 'IBM Plex Sans JP', 'KEI Worn Sans', s, b)
                 for s, b in faces(SANS / f'{weight}.css', 'IBM Plex Sans JP', 'KEI Worn Sans', './')]
        jobs += [(MONO, f'{weight}.css', 'IBM Plex Mono', 'KEI Worn Mono', s, b)
                 for s, b in faces(MONO / f'{weight}.css', 'IBM Plex Mono', 'KEI Worn Mono', './')]
    for package, _, _, family, source, block in jobs:
        # KEI Mono only takes Latin from Plex Mono; Japanese falls through to the sans.
        if family == 'KEI Worn Mono' and not re.search(r'-latin-\d', source):
            continue
        target = out / source.replace('ibm-plex-sans-jp', 'kei-worn-sans').replace('ibm-plex-mono', 'kei-worn-mono')
        block = block.replace(f'./{source}', f'./{target.name}')
        if family == 'KEI Worn Mono':
            block = block.replace('font-display: swap;', 'font-display: swap;\n  size-adjust: 83.333%;')
        if not target.exists():
            font = TTFont(package / 'files' / source)
            wear_glyphs(font, salt)
            rename(font, family)
            font.flavor = 'woff2'
            font.save(target)
        blocks.append(block)
        report['files'] += 1
        report['bytes'] += target.stat().st_size
    (out / 'fonts.css').write_text(
        '/* Generated by scripts/wear/font.py. Modified IBM Plex, SIL OFL 1.1; see LICENSE.txt. */\n'
        + '\n'.join(blocks) + '\n')
    license_text = (SANS / 'LICENSE').read_text()
    (out / 'LICENSE.txt').write_text(
        'KEI Worn Sans and KEI Worn Mono are modified versions of IBM Plex Sans JP and IBM Plex Mono.\n'
        'Copyright 2017 IBM Corp. with Reserved Font Name "Plex". Modified by KEI: outlines displaced\n'
        f'by seeded noise (salt "{salt}"), hinting removed, renamed.\n\n' + license_text)
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
