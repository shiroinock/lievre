"""Bakes worn glyphs into a renamed copy of IBM Plex Sans JP and the KEI Mono Latin files.

The skeleton of each glyph stays where it is; only the edge wears, as on a worn print. Every
outline is cut into short straight runs (step), and each new point moves only along the outline's
normal: a fine noise roughens the edge (rough, rough_scale), and a broad one lets the ink swell or
thin from place to place (swell, swell_scale). Both noises are seeded by hash(salt + 'glyph' +
glyph name), so a glyph wears the same way for a given salt, for Japanese and Latin alike.
How far a point may move is capped against the weight's thinnest stroke, and small contours
(dakuten, dots, punctuation) move less, so nothing fills in or breaks.

Sans JP and Mono take the same salt and the same values, so words and figures wear alike.
Only outlines move: advance widths stay as they were, so Latin keeps half the width of kana and
kanji and table figures stay aligned. `check` compares every advance with the original and
checks that each glyph's left side bearing matches its moved outline.

The files keep the Google Fonts unicode-range split from @fontsource, so a page loads only the
slices it uses. IBM Plex is licensed under the SIL OFL 1.1 with the Reserved Font Name "Plex":
the modified fonts must not carry that name, so they are published as "KEI Worn Sans" and
"KEI Worn Mono".

Usage: python3 scripts/wear/font.py <salt> <out-dir> [weights...]
       python3 scripts/wear/font.py check <out-dir>
       python3 scripts/wear/font.py preview <out-dir>   (salt and text as JSON on stdin)
Values come from KEI_WEAR_ROUGH, KEI_WEAR_ROUGH_SCALE, KEI_WEAR_SWELL, KEI_WEAR_SWELL_SCALE and
KEI_WEAR_STEP (1/1000 em). Requires fontTools and brotli (pip install fonttools brotli).
"""

import json
import math
import os
import re
import sys
from multiprocessing import Pool
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates

MASK = 0xFFFFFFFF
SANS = Path('node_modules/@fontsource/ibm-plex-sans-jp')
MONO = Path('node_modules/@fontsource/ibm-plex-mono')

# Font units (1000 per em); scripts/build-wear-font.mjs passes the values in wear.config.json.
def value(name, default):
    return float(os.environ.get(f'KEI_WEAR_{name}', default))


ROUGH, ROUGH_SCALE = value('ROUGH', 7), value('ROUGH_SCALE', 22)
SWELL, SWELL_SCALE = value('SWELL', 4), value('SWELL_SCALE', 220)
STEP = max(4.0, value('STEP', 14))
# Thinnest strokes per weight (the horizontals of 一 二 三 in Sans JP, the bar of H in Mono), and
# how much of one a point may move: the edge by 20%, the swell by 12%, both together by 25%.
THIN = {'sans': {400: 60, 500: 85, 600: 100}, 'mono': {400: 70, 500: 90, 600: 105}}
EDGE_SHARE, SWELL_SHARE, TOTAL_SHARE = 0.2, 0.12, 0.25


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


def quad(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def flatten(points):
    """One closed TrueType contour [(x, y, on)] as straight runs no longer than STEP."""
    if not any(on for _, _, on in points):
        points = [((points[0][0] + points[-1][0]) / 2, (points[0][1] + points[-1][1]) / 2, True)] + points
    start = next(i for i, (_, _, on) in enumerate(points) if on)
    points = points[start:] + points[:start]
    out, prev, n = [], points[0][:2], len(points)
    i = 1
    while i <= n:
        x, y, on = points[i % n]
        if on:
            length = math.hypot(x - prev[0], y - prev[1])
            steps = max(1, math.ceil(length / STEP))
            out += [(prev[0] + (x - prev[0]) * k / steps, prev[1] + (y - prev[1]) * k / steps)
                    for k in range(1, steps + 1)]
            prev = (x, y)
            i += 1
            continue
        nx, ny, non = points[(i + 1) % n]
        end = (nx, ny) if non else ((x + nx) / 2, (y + ny) / 2)
        length = (math.hypot(x - prev[0], y - prev[1]) + math.hypot(end[0] - x, end[1] - y)
                  + math.hypot(end[0] - prev[0], end[1] - prev[1])) / 2
        steps = max(1, math.ceil(length / STEP))
        out += [quad(prev, (x, y), end, k / steps) for k in range(1, steps + 1)]
        prev = end
        i += 2 if non else 1
    return out


def wear_contour(points, seed, thin):
    """Moves each point along the outline normal, away from the ink when positive."""
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    # Small contours (dots, dakuten, the tail of a comma) move less, so they keep their shape.
    small = min(1.0, min(max(xs) - min(xs), max(ys) - min(ys)) / (4 * thin))
    edge_cap, swell_cap = EDGE_SHARE * thin * small, SWELL_SHARE * thin * small
    total_cap = TOTAL_SHARE * thin * small
    se, sw = seed ^ 0x9E3779B9, seed ^ 0x85EBCA6B
    n, out = len(points), []
    for i, (x, y) in enumerate(points):
        (ax, ay), (bx, by) = points[i - 1], points[(i + 1) % n]
        tx, ty = bx - ax, by - ay
        norm = math.hypot(tx, ty) or 1.0
        # TrueType keeps ink on the right of the direction of travel, so left is away from it.
        nx, ny = -ty / norm, tx / norm
        edge = (noise2(se, x / ROUGH_SCALE, y / ROUGH_SCALE) - 0.5) * 2 * ROUGH
        swell = (noise2(sw, x / SWELL_SCALE, y / SWELL_SCALE) - 0.5) * 2 * SWELL
        d = max(-edge_cap, min(edge_cap, edge)) + max(-swell_cap, min(swell_cap, swell))
        d = max(-total_cap, min(total_cap, d))
        out.append((round(x + nx * d), round(y + ny * d)))
    # Rounding can stack points; a contour needs three distinct ones.
    out = [p for i, p in enumerate(out) if p != out[i - 1]]
    return out if len(out) >= 3 else [(round(x), round(y)) for x, y in points]


def wear_glyphs(font, salt, family='sans', weight=400):
    glyf = font['glyf']
    hmtx = font['hmtx'].metrics
    vmtx = font['vmtx'].metrics if 'vmtx' in font else {}
    order = font.getGlyphOrder()
    thin = THIN[family].get(weight, THIN[family][400])
    tops = {}
    for name in order:
        glyph = glyf[name]
        if glyph.numberOfContours:
            glyph.recalcBounds(glyf)
            tops[name] = glyph.yMax
    for name in order:
        glyph = glyf[name]
        if hasattr(glyph, 'program'):
            glyph.program = ttProgram.Program()
            glyph.program.fromBytecode(b'')
        if glyph.isComposite() or glyph.numberOfContours <= 0:
            continue
        seed = seed_for(salt, 'glyph', name)
        coords, ends, flags = glyph.coordinates, glyph.endPtsOfContours, glyph.flags
        new, new_ends, begin = [], [], 0
        for end in ends:
            contour = [(coords[k][0], coords[k][1], bool(flags[k] & 1)) for k in range(begin, end + 1)]
            begin = end + 1
            new += wear_contour(flatten(contour), seed, thin)
            new_ends.append(len(new) - 1)
        glyph.coordinates = GlyphCoordinates(new)
        glyph.endPtsOfContours = new_ends
        glyph.flags = bytearray([1] * len(new))
    # Outlines change inside the glyph's own box; the origin and the advance stay where they were.
    # lsb follows the new xMin (and tsb the new yMax), composites included.
    for name in tops:
        glyph = glyf[name]
        glyph.recalcBounds(glyf)
        hmtx[name] = (hmtx[name][0], glyph.xMin)
        if name in vmtx:
            vmtx[name] = (vmtx[name][0], vmtx[name][1] + tops[name] - glyph.yMax)
    # Moved outlines no longer match the hinting programs.
    for table in ('fpgm', 'prep', 'cvt '):
        if table in font:
            del font[table]


def advances(font):
    tables = [t for t in ('hmtx', 'vmtx') if t in font]
    return {(t, name): font[t].metrics[name][0] for t in tables for name in font.getGlyphOrder()}


def check(out):
    """Every worn file keeps the original advance of every glyph, and the same glyph order."""
    sources = {'kei-worn-sans': SANS, 'kei-worn-mono': MONO}
    checked, glyphs = 0, 0
    for target in sorted(out.glob('kei-worn-*.woff2')):
        family = 'kei-worn-sans' if target.name.startswith('kei-worn-sans') else 'kei-worn-mono'
        original = 'ibm-plex-sans-jp' if family == 'kei-worn-sans' else 'ibm-plex-mono'
        before = TTFont(sources[family] / 'files' / target.name.replace(family, original), lazy=True)
        after = TTFont(target, lazy=True)
        assert before.getGlyphOrder() == after.getGlyphOrder(), f'{target.name}: glyph order changed'
        a, b = advances(before), advances(after)
        changed = [k for k in a if a[k] != b.get(k)]
        assert not changed, f'{target.name}: advance changed for {changed[:5]}'
        # The origin stays put: lsb is the left edge of the moved outline, as TrueType expects.
        glyf, hmtx = after['glyf'], after['hmtx']
        shifted = [n for n in after.getGlyphOrder()
                   if glyf[n].numberOfContours and hmtx[n][1] != glyf[n].xMin]
        assert not shifted, f'{target.name}: lsb does not match the outline for {shifted[:5]}'
        checked, glyphs = checked + 1, glyphs + len(a)
    assert checked, f'no worn fonts in {out}'
    print(json.dumps({'checked': checked, 'advances': glyphs}))


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


def bake(job):
    """Wears one slice file; run in a worker process."""
    package, source, family, target, salt = job
    weight = int(re.search(r'-(\d00)-normal', source).group(1))
    font = TTFont(package / 'files' / source)
    wear_glyphs(font, salt, 'mono' if family == 'KEI Worn Mono' else 'sans', weight)
    rename(font, family)
    font.flavor = 'woff2'
    font.save(target)


def slices(weights):
    """Every @fontsource slice to wear: all of Sans JP, and the Latin of Plex Mono."""
    for weight in weights:
        yield from ((SANS, 'KEI Worn Sans', s, b)
                    for s, b in faces(SANS / f'{weight}.css', 'IBM Plex Sans JP', 'KEI Worn Sans', './'))
        # KEI Mono only takes Latin from Plex Mono; Japanese falls through to the sans.
        yield from ((MONO, 'KEI Worn Mono', s, b)
                    for s, b in faces(MONO / f'{weight}.css', 'IBM Plex Mono', 'KEI Worn Mono', './')
                    if re.search(r'-latin-\d', s))


def settings():
    return {'rough': ROUGH, 'roughScale': ROUGH_SCALE, 'swell': SWELL, 'swellScale': SWELL_SCALE,
            'step': STEP}


def main():
    if sys.argv[1] == 'check':
        return check(Path(sys.argv[2]))
    if sys.argv[1] == 'preview':
        return preview(Path(sys.argv[2]))
    salt, out = sys.argv[1], Path(sys.argv[2])
    weights = sys.argv[3:] or ['400', '500', '600']
    out.mkdir(parents=True, exist_ok=True)
    blocks, jobs = [], []
    report = {'salt': salt, 'outline': settings(), 'files': 0, 'bytes': 0}
    for package, family, source, block in slices(weights):
        target = out / source.replace('ibm-plex-sans-jp', 'kei-worn-sans').replace('ibm-plex-mono', 'kei-worn-mono')
        block = block.replace(f'./{source}', f'./{target.name}')
        if family == 'KEI Worn Mono':
            block = block.replace('font-display: swap;', 'font-display: swap;\n  size-adjust: 83.333%;')
        if not target.exists():
            jobs.append((package, source, family, target, salt))
        blocks.append((block, target))
    # Cutting every outline into short runs is slow in pure Python; spread the slices over cores.
    with Pool() as pool:
        pool.map(bake, jobs, chunksize=1)
    for block, target in blocks:
        report['files'] += 1
        report['bytes'] += target.stat().st_size
    (out / 'fonts.css').write_text(
        '/* Generated by scripts/wear/font.py. Modified IBM Plex, SIL OFL 1.1; see LICENSE.txt. */\n'
        + '\n'.join(block for block, _ in blocks) + '\n')
    license_text = (SANS / 'LICENSE').read_text()
    (out / 'LICENSE.txt').write_text(
        'KEI Worn Sans and KEI Worn Mono are modified versions of IBM Plex Sans JP and IBM Plex Mono.\n'
        'Copyright 2017 IBM Corp. with Reserved Font Name "Plex". Modified by KEI: outlines cut into\n'
        f'short runs and their edges roughened by seeded noise (salt "{salt}"), hinting removed,\n'
        'renamed.\n\n' + license_text)
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


def covers(unicode_range, text):
    for part in unicode_range.split(','):
        lo, _, hi = part.strip()[2:].partition('-')
        lo = int(lo, 16)
        hi = int(hi, 16) if hi else lo
        if any(lo <= ord(ch) <= hi for ch in text):
            return True
    return False


def preview(out):
    """Wears only the characters of a sample text, for the tuning page. Reads {salt, text} as JSON
    on stdin and prints the faces it wrote. The same values give the same glyphs as a full bake."""
    from fontTools import subset
    request = json.load(sys.stdin)
    salt, text = request['salt'], request['text'] + ' '
    out.mkdir(parents=True, exist_ok=True)
    faces_out = []
    for package, family, source, block in slices(['400', '500', '600']):
        unicode_range = re.search(r'unicode-range: ([^;]+);', block).group(1)
        if not covers(unicode_range, text):
            continue
        weight = int(re.search(r'-(\d00)-normal', source).group(1))
        font = TTFont(package / 'files' / source)
        # Glyph names seed the noise; keep them as the full font has them.
        names = font.getGlyphOrder()
        options = subset.Options(glyph_names=True, notdef_outline=True, hinting=False,
                                 layout_features=['*'])
        subsetter = subset.Subsetter(options)
        subsetter.populate(text=text)
        subsetter.subset(font)
        assert set(font.getGlyphOrder()) <= set(names)
        wear_glyphs(font, salt, 'mono' if family == 'KEI Worn Mono' else 'sans', weight)
        font.flavor = 'woff2'
        target = out / source.replace('ibm-plex-sans-jp', 'preview-sans').replace('ibm-plex-mono', 'preview-mono')
        font.save(target)
        faces_out.append({'family': family, 'weight': weight, 'file': target.name,
                          'unicodeRange': unicode_range,
                          'sizeAdjust': '83.333%' if family == 'KEI Worn Mono' else '100%'})
    print(json.dumps({'faces': faces_out, 'outline': settings()}))


if __name__ == '__main__':
    main()
