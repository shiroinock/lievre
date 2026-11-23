// The fonts lievre sets put the Japanese em box in the middle of the line box (DESIGN.md「書体」).
// Measured in the browser from the faces it actually uses, so a font that loses its correction
// (fonts.css not loaded, a token pointing at plain 'IBM Plex Sans JP') stops here, before the
// parts' own checks see it as uneven padding.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { LievreProvider } from '../../index';
import '../../styles/fonts.css';
import '../../styles/lievre.css';
import { FACE_MIDDLE } from '../../../scripts/measure-alignment.js';

let root: Root | undefined;
afterEach(() => {
  root?.unmount();
  document.body.replaceChildren();
});

const FACES = [
  { name: '本文（--lv-font-sans）', family: 'Lievre Sans', className: '', height: 1.5 },
  // Lievre Term JP: ascent 0.98em, descent 0.22em.
  {
    name: '等幅（--lv-font-mono）',
    family: 'Lievre Term JP',
    className: 'lv-mono',
    height: 1.2,
  },
];

describe('書体の行の中央', () => {
  for (const face of FACES) {
    for (const weight of [400, 500, 600]) {
      it(`${face.name} ${weight}：日本語の字面の枠が行の箱の中央にある`, async () => {
        const host = document.body.appendChild(document.createElement('div'));
        root = createRoot(host);
        flushSync(() =>
          root!.render(
            <LievreProvider>
              <p className={face.className} style={{ fontWeight: weight }}>
                日本語 ABC 0123
              </p>
            </LievreProvider>,
          ),
        );
        const p = host.querySelector('p')!;
        const s = getComputedStyle(p);
        expect(s.fontFamily.split(',')[0].replace(/['"]/g, '').trim()).toBe(face.family);
        await document.fonts.load(`${weight} 16px ${s.fontFamily}`, '日本語 ABC 0123');
        expect(document.fonts.check(`${weight} 16px '${face.family}'`, 'A')).toBe(true);
        // Large, so the browser's rounding of ascent and descent to whole pixels is negligible.
        const size = 1000;
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${weight} ${size}px ${s.fontFamily}`;
        const m = ctx.measureText('0');
        const middle = (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 / size;
        const height = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) / size;
        expect(middle, '行の中央のベースラインからの高さ（em）').toBeCloseTo(FACE_MIDDLE, 2);
        expect(height, '行の箱の高さ（em）。補正で変えない').toBeCloseTo(face.height, 2);
      });
    }
  }
});
