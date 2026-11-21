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
    // Only our own records (JSON and notes) belong here, so any other kind of file is caught.
    const images = tracked.filter(
      (file) => file.startsWith('references/pinterest/') && !/\.(json|md)$/.test(file),
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

  // A board URL carries the account name; a pin URL (/pin/<id>/) does not.
  it('name no Pinterest account', () => {
    for (const file of tracked) {
      if (!/\.(json|md|html)$/.test(file)) continue;
      const text = readFileSync(join(root, file), 'utf8');
      expect(
        text.match(/pinterest\.com\/(?!pin\/)[\w.-]+\/[\w.-]+/g) ?? [],
        `${file}：Pinterest のボードやアカウントの URL は書かないでください（アカウント名が入ります）。ピンの URL（/pin/<番号>/）だけを残してください`,
      ).toEqual([]);
    }
  });

  it('copy no title of the pins', () => {
    for (const file of tracked.filter((name) => name.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(join(root, file), 'utf8')) as { references?: unknown };
      if (!Array.isArray(data.references)) continue;
      const titled = (data.references as Record<string, unknown>[])
        .filter((ref) => String(ref.id).startsWith('pin-') && 'title' in ref)
        .map((ref) => String(ref.id));
      expect(
        titled,
        `${file}：ピンの題名は投稿した人の文なので写さないでください。見分けには自分で付けた label を使います`,
      ).toEqual([]);
    }
  });
});
