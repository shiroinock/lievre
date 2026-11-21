import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The repository is public: other people's work (the Pinterest pins) stays at its URL, never here.
const root = join(import.meta.dirname, '../../../..');
const tracked = execFileSync('git', ['ls-files', '--', 'references'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

describe('References', () => {
  it('keep no image of the pins', () => {
    const images = tracked.filter(
      (file) =>
        file.startsWith('references/pinterest/') && /\.(jpe?g|png|gif|webp|avif)$/i.test(file),
    );
    expect(
      images,
      'ピンの画像は置かないでください。元の作品の権利は各権利者にあります。カタログには URL と自分の観察だけを書いてください',
    ).toEqual([]);
  });

  it('point to no image of the pins', () => {
    for (const file of tracked.filter((name) => name.endsWith('.json'))) {
      const text = readFileSync(join(root, file), 'utf8');
      expect(
        text,
        `${file}：ピンの画像への参照（thumbnail など）は書かないでください。元の作品は URL から見ます`,
      ).not.toMatch(/"(thumbnail|thumbnail_source|screenshot_frames)"\s*:/);
    }
  });
});
