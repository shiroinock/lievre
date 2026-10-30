"""Builds the trial "Lievre Term" font: IBM Plex Mono (Latin) with ten lievre glyphs in the private use area.

The added glyphs fill one terminal cell each (600 units wide, from the descender -275 to the
ascender 1025) so lines meet the next cell:

  U+E500–E503  card corners, radius 200 (a third of a cell) instead of a half-cell arc
  U+E504–E505  card edges, the same 50-unit stroke as the corners, on the cell's center lines
  U+E506–E507  button caps: the cell filled in the button's color with rounded outer corners
  U+E508–E509  focus ring: a thin bracket with a gap before the cap, like outline-offset

U+E500–U+E53F lies in a gap that Nerd Fonts 3.5.1 leaves free (its glyphs stop at U+E3E3 and
start again at U+E5FA), so Lievre Term can sit next to a Nerd Font in a fallback list.

IBM Plex is licensed under the SIL OFL 1.1 with the Reserved Font Name "Plex", so the result is
named "Lievre Term" and carries the OFL (OFL.txt next to this file).

Usage: python3 -I spikes/tui/font/build.py   (requires fontTools and brotli)
       python3 -I spikes/tui/font/build.py check
"""

import math
import sys
from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = ROOT / 'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'
OUT = HERE / 'LievreTerm-Regular.ttf'

W, TOP, BOTTOM = 600, 1025, -275
MID_X, MID_Y = W / 2, (TOP + BOTTOM) / 2
STROKE, RADIUS = 50, 200
# Lines run a little past the cell so neighbours overlap instead of leaving a hairline seam.
BLEED = 12

CODEPOINTS = {
    0xE500: 'lievre.frame.topLeft',
    0xE501: 'lievre.frame.topRight',
    0xE502: 'lievre.frame.bottomLeft',
    0xE503: 'lievre.frame.bottomRight',
    0xE504: 'lievre.frame.horizontal',
    0xE505: 'lievre.frame.vertical',
    0xE506: 'lievre.button.capLeft',
    0xE507: 'lievre.button.capRight',
    0xE508: 'lievre.focus.left',
    0xE509: 'lievre.focus.right',
}


def rect(pen, x0, y0, x1, y1):
    pen.moveTo((x0, y0))
    pen.lineTo((x0, y1))
    pen.lineTo((x1, y1))
    pen.lineTo((x1, y0))
    pen.closePath()


def arc_points(cx, cy, r, start, end):
    """A quarter arc from angle start to end as two quadratic curves (one is visibly too flat)."""
    a0, a1 = math.radians(start), math.radians(end)
    am = (a0 + a1) / 2
    ctrl = r / math.cos((a1 - a0) / 4)
    q1 = (cx + ctrl * math.cos((a0 + am) / 2), cy + ctrl * math.sin((a0 + am) / 2))
    mid = (cx + r * math.cos(am), cy + r * math.sin(am))
    q2 = (cx + ctrl * math.cos((am + a1) / 2), cy + ctrl * math.sin((am + a1) / 2))
    end_pt = (cx + r * math.cos(a1), cy + r * math.sin(a1))
    return [(q1, mid), (q2, end_pt)]


def corner(pen, sx, sy):
    """Top-left corner, mirrored by sx / sy: a horizontal line to the right edge and a vertical
    line to the bottom edge, joined by an arc of RADIUS on the cell's center lines."""
    h = STROKE / 2
    ro, ri = RADIUS + h, RADIUS - h
    cx, cy = MID_X + RADIUS, MID_Y - RADIUS  # arc center, top-left orientation
    def p(x, y):
        return (MID_X + (x - MID_X) * sx, MID_Y + (y - MID_Y) * sy)

    # Outer edge: from the bottom of the cell up the left side of the stroke, around, to the right.
    pts = [p(MID_X - h, BOTTOM - BLEED), p(MID_X - h, cy)]
    outer = arc_points(cx, cy, ro, 180, 90)
    inner = arc_points(cx, cy, ri, 90, 180)
    path = [('line', pts[0]), ('line', pts[1])]
    path += [('q', p(*a), p(*b)) for a, b in outer]
    path += [('line', p(W + BLEED, MID_Y + h)), ('line', p(W + BLEED, MID_Y - h)), ('line', p(cx, MID_Y - h))]
    path += [('q', p(*a), p(*b)) for a, b in inner]
    path += [('line', p(MID_X + h, BOTTOM - BLEED))]
    # Mirroring once flips the winding; TrueType wants outer contours clockwise.
    if (sx * sy) < 0:
        path = reverse(path)
    draw(pen, path)


def reverse(path):
    """Reverses a path of ('line', pt) and ('q', ctrl, pt) segments."""
    points = list(path)
    out = [('line', points[-1][-1])]
    for i in range(len(points) - 1, 0, -1):
        kind = points[i][0]
        prev_pt = points[i - 1][-1]
        if kind == 'q':
            out.append(('q', points[i][1], prev_pt))
        else:
            out.append(('line', prev_pt))
    return out


def draw(pen, path):
    pen.moveTo(path[0][-1])
    for seg in path[1:]:
        if seg[0] == 'line':
            pen.lineTo(seg[1])
        else:
            pen.qCurveTo(seg[1], seg[2])
    pen.closePath()


def rounded_half(pen, left):
    """Button cap: the cell filled, with its outer corners rounded by RADIUS - 50."""
    r = RADIUS - 50
    x_out, x_in = (150, W + BLEED) if left else (W - 150, -BLEED)
    y0, y1 = BOTTOM - BLEED, TOP + BLEED
    if left:
        path = [('line', (x_in, y0)), ('line', (x_out + r, y0))]
        path += [('q', a, b) for a, b in arc_points(x_out + r, y0 + r, r, 270, 180)]
        path += [('line', (x_out, y1 - r))]
        path += [('q', a, b) for a, b in arc_points(x_out + r, y1 - r, r, 180, 90)]
        path += [('line', (x_in, y1))]
        draw(pen, path)
    else:
        path = [('line', (x_in, y0)), ('line', (x_out - r, y0))]
        path += [('q', a, b) for a, b in arc_points(x_out - r, y0 + r, r, 270, 360)]
        path += [('line', (x_out, y1 - r))]
        path += [('q', a, b) for a, b in arc_points(x_out - r, y1 - r, r, 0, 90)]
        path += [('line', (x_in, y1))]
        draw(pen, reverse(path))


def bracket(pen, left):
    """Focus ring: a thin bracket whose stroke sits 175 units before the cap (about 3px at 16px,
    lievre's outline-offset), its ends turning toward the button and stopping at the cell edge."""
    r = 50
    h = STROKE / 2
    xc = W - r if left else r
    y0, y1 = BOTTOM + 60, TOP - 60
    sign = 1 if left else -1
    # Outer and inner arcs at both ends, the ends opening toward the button.
    cx_top, cy_top = xc + sign * r, y1 - r
    cx_bot, cy_bot = xc + sign * r, y0 + r
    end_x = W + BLEED if left else -BLEED
    if left:
        path = [('line', (end_x, y0 - h)), ('line', (cx_bot, y0 - h))]
        path += [('q', a, b) for a, b in arc_points(cx_bot, cy_bot, r + h, 270, 180)]
        path += [('line', (xc - h, cy_top))]
        path += [('q', a, b) for a, b in arc_points(cx_top, cy_top, r + h, 180, 90)]
        path += [('line', (end_x, y1 + h)), ('line', (end_x, y1 - h)), ('line', (cx_top, y1 - h))]
        path += [('q', a, b) for a, b in arc_points(cx_top, cy_top, r - h, 90, 180)]
        path += [('line', (xc + h, cy_bot))]
        path += [('q', a, b) for a, b in arc_points(cx_bot, cy_bot, r - h, 180, 270)]
        path += [('line', (end_x, y0 + h))]
        draw(pen, path)
    else:
        path = [('line', (end_x, y0 - h)), ('line', (cx_bot, y0 - h))]
        path += [('q', a, b) for a, b in arc_points(cx_bot, cy_bot, r + h, 270, 360)]
        path += [('line', (xc + h, cy_top))]
        path += [('q', a, b) for a, b in arc_points(cx_top, cy_top, r + h, 0, 90)]
        path += [('line', (end_x, y1 + h)), ('line', (end_x, y1 - h)), ('line', (cx_top, y1 - h))]
        path += [('q', a, b) for a, b in arc_points(cx_top, cy_top, r - h, 90, 0)]
        path += [('line', (xc - h, cy_bot))]
        path += [('q', a, b) for a, b in arc_points(cx_bot, cy_bot, r - h, 360, 270)]
        path += [('line', (end_x, y0 + h))]
        draw(pen, reverse(path))


def glyph(name, font):
    pen = TTGlyphPen(font.getGlyphSet())
    h = STROKE / 2
    if name == 'lievre.frame.horizontal':
        rect(pen, -BLEED, MID_Y - h, W + BLEED, MID_Y + h)
    elif name == 'lievre.frame.vertical':
        rect(pen, MID_X - h, BOTTOM - BLEED, MID_X + h, TOP + BLEED)
    elif name.startswith('lievre.frame.'):
        which = name.split('.')[-1]
        sx = 1 if 'Left' in which else -1
        sy = 1 if which.startswith('top') else -1
        corner(pen, sx, sy)
    elif name.startswith('lievre.button.'):
        rounded_half(pen, name.endswith('Left'))
    else:
        bracket(pen, name.endswith('left'))
    return pen.glyph()


def build():
    font = TTFont(SOURCE)
    font.flavor = None
    order = font.getGlyphOrder()
    for cp, name in CODEPOINTS.items():
        order.append(name)
    font.setGlyphOrder(order)
    for cp, name in CODEPOINTS.items():
        font['glyf'][name] = glyph(name, font)
        font['glyf'][name].recalcBounds(font['glyf'])
        font['hmtx'][name] = (W, font['glyf'][name].xMin)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap.update({cp: name for cp, name in CODEPOINTS.items()})
    font['maxp'].numGlyphs = len(order)
    names = {
        1: 'Lievre Term',
        2: 'Regular',
        3: 'Lievre Term Regular trial',
        4: 'Lievre Term Regular',
        5: 'Version 0.0.1 (trial; from IBM Plex Mono 2.3)',
        6: 'LievreTerm-Regular',
        16: 'Lievre Term',
        17: 'Regular',
    }
    name_table = font['name']
    name_table.names = [n for n in name_table.names if n.nameID not in names and n.nameID not in (16, 17)]
    for nid, value in names.items():
        name_table.setName(value, nid, 3, 1, 0x409)
        name_table.setName(value, nid, 1, 0, 0)
    # The OFL notice stays, and a line says what changed.
    name_table.setName(
        'Copyright 2017 IBM Corp. Modified 2026 for lievre (added private use glyphs).', 0, 3, 1, 0x409
    )
    font.save(OUT)
    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)')


def check():
    """Every added glyph is one cell wide, sits inside the cell, and no name carries "Plex"."""
    font = TTFont(OUT)
    cmap = font.getBestCmap()
    problems = []
    for cp in CODEPOINTS:
        # Glyph names do not survive a post table without names, so go through the cmap.
        name = cmap.get(cp)
        if name is None:
            problems.append(f'U+{cp:04X} not mapped')
            continue
        g = font['glyf'][name]
        if font['hmtx'][name][0] != W:
            problems.append(f'{name} advance {font["hmtx"][name][0]}')
        if g.xMin < -BLEED or g.xMax > W + BLEED or g.yMin < BOTTOM - BLEED or g.yMax > TOP + BLEED:
            problems.append(f'{name} bounds {g.xMin},{g.yMin} {g.xMax},{g.yMax}')
    for record in font['name'].names:
        text = record.toUnicode()
        if record.nameID in (1, 3, 4, 6, 16) and 'Plex' in text:
            problems.append(f'name {record.nameID} carries the reserved name: {text}')
    if any(font['hmtx'][g][0] not in (0, W) for g in font.getGlyphOrder()):
        problems.append('a glyph is not one cell wide')
    print('\n'.join(problems) or 'ok')
    return not problems


if __name__ == '__main__':
    if sys.argv[1:] == ['check']:
        sys.exit(0 if check() else 1)
    build()
    sys.exit(0 if check() else 1)
