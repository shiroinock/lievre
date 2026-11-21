import { describe, it, expect } from 'vitest';
import tokens from '@lievre/tokens/tokens.json';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { resolve, themeTokens } from '../wear/contrast.mjs';

// The logos are hand-written SVGs, so nothing regenerates them when a token changes.
const root = resolvePath(__dirname, '../../../..');
const logoDir = resolvePath(root, 'logo');
const files = readdirSync(logoDir).filter((file) => file.endsWith('.svg'));

// Each class in the logos stands for one token.
const CLASS_TOKEN: Record<string, string> = {
  i: 'text',
  a: 'accent',
  g: 'on-accent',
  s: 'on-accent',
  // The white tile behind the README logo.
  b: 'surface-raised',
};

const hex = (value: string) => {
  const lower = value.toLowerCase();
  return lower.length === 4 ? `#${[...lower.slice(1)].map((c) => c + c).join('')}` : lower;
};

const colours = (rules: string) =>
  [...rules.matchAll(/\.(\w)\{([^}]*)\}/g)].flatMap(([, cls, body]) =>
    [...body.matchAll(/(?:fill|stroke):(#[0-9a-fA-F]{3,6})/g)].map(([, value]) => ({
      cls,
      value: hex(value),
    })),
  );

const expectTheme = (file: string, rules: string, theme: 'paper' | 'ink') => {
  const set = themeTokens(tokens, theme);
  for (const { cls, value } of colours(rules)) {
    const token = CLASS_TOKEN[cls];
    expect(token, `${file}: .${cls} はどのトークンにも対応していません`).toBeDefined();
    expect(value, `${file}: ${theme} の .${cls} は --lv-${token} の値に合わせてください`).toBe(
      hex(resolve(set, token)),
    );
  }
};

describe('Logos', () => {
  for (const file of files) {
    const svg = readFileSync(resolvePath(logoDir, file), 'utf8');
    const style = svg.match(/<style>(.*)<\/style>/s)?.[1] ?? '';
    const media = style.match(/@media \(prefers-color-scheme:dark\)\{(.*)\}$/s);
    it(`${file} uses the token colours`, () => {
      if (media) {
        expectTheme(file, style.slice(0, media.index), 'paper');
        expectTheme(file, media[1], 'ink');
      } else if (file.endsWith('-light.svg')) expectTheme(file, style, 'paper');
      else if (file.endsWith('-dark.svg')) expectTheme(file, style, 'ink');
      else
        throw new Error(
          `${file}: 明暗の切り替え（@media）を入れるか、色を固定するなら名前を -light.svg か -dark.svg で終えてください`,
        );
    });
  }

  // An SVG's own prefers-color-scheme follows the OS, not GitHub's theme.
  it('README shows the logo on its own white tile', () => {
    const readme = readFileSync(resolvePath(root, 'README.md'), 'utf8');
    const sources = [...readme.matchAll(/(?:src|srcset)="(logo\/[^"]+)"/g)].map(([, src]) => src);
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources)
      expect(
        src,
        'README のロゴは、白い下地ごと色を固定した -tile-light.svg を使ってください（GitHub のテーマに左右されないように）',
      ).toMatch(/-tile-light\.svg$/);
  });
});
