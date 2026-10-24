// The layout gate: every story, in every theme × density × typography, measured in a real browser.
// A part that misses a criterion fails here unless it is listed in baseline.ts with a reason.
import { describe, it, beforeAll } from 'vitest';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as kei from '../../index';
import { checkPart, undeclared, type Violation } from './checks';
import { CHECK_LABEL, type LayoutGate } from './declare';
import { BASELINE, NOT_A_PART, type Combo } from './baseline';

setProjectAnnotations(preview);

type StoryModule = Parameters<typeof composeStories>[0] & {
  default: { title: string; component?: unknown; parameters?: { layoutGate?: LayoutGate } };
};
const files = Object.entries(
  import.meta.glob<StoryModule>('../../stories/*.stories.tsx', { eager: true }),
).map(([path, module]) => ({ file: `src/stories/${path.split('/').pop()}`, module }));

const COMBOS: Combo[] = (['paper', 'ink'] as const).flatMap((theme) =>
  (['comfortable', 'compact'] as const).flatMap((density) =>
    (['standard', 'interface'] as const).map((typography) => ({ theme, density, typography })),
  ),
);
const comboLabel = (c: Combo) =>
  `${c.theme === 'paper' ? 'Paper' : 'Ink'}・${c.density === 'comfortable' ? '標準の密度' : '高密度'}・${c.typography === 'standard' ? '本文16px' : '本文14px'}`;

const usedBaseline = new Set<number>();
const foundParts = new Map<string, number>();
const measuredCombos = new Map<string, number>();
const known = (title: string, v: Violation, combo: Combo) =>
  BASELINE.findIndex(
    (b) =>
      b.story === title &&
      b.part === v.part &&
      b.check === v.check &&
      Object.entries(b.when ?? {}).every(([k, value]) => combo[k as keyof Combo] === value),
  );

// One readable line per problem, rather than a diff of two arrays.
function pass(problems: string[]) {
  if (problems.length) throw new Error(`\n${[...new Set(problems)].join('\n')}\n`);
}

beforeAll(async () => {
  await document.fonts.ready;
});

describe('配置の宣言', () => {
  it('すべての Story ファイルが parameters.layoutGate を持つ', () => {
    const missing = files.flatMap(({ file, module }) => {
      const gate = module.default.parameters?.layoutGate;
      if (!gate)
        return [
          `${file} に配置の宣言がありません。meta の parameters.layoutGate に、測る部品（{ parts: [{ name, selector, checks }] }）か、測らない理由（{ skip: '…' }）を書いてください。書き方は CONTRIBUTING.md にあります。`,
        ];
      if ('skip' in gate && !gate.skip.trim())
        return [`${file} の layoutGate.skip に、測らない理由を書いてください。`];
      if ('parts' in gate) {
        if (!gate.parts.length) return [`${file} の layoutGate.parts が空です。`];
        return gate.parts
          .filter((p) => !p.selector.trim().startsWith('.k-') || !p.checks.length)
          .map(
            (p) =>
              `${file} の部品「${p.name}」：selector は .k- で始め、checks を1つ以上書いてください。`,
          );
      }
      return [];
    });
    pass(missing);
  });

  it('公開している部品には、それぞれ配置を測る Story がある', () => {
    const covered = new Set<unknown>(
      files
        .filter(({ module }) => {
          const gate = module.default.parameters?.layoutGate;
          return gate && 'parts' in gate;
        })
        .map(({ module }) => module.default.component),
    );
    const missing = Object.entries(kei)
      .filter(([name, value]) => /^[A-Z]/.test(name) && value && typeof value !== 'string')
      .filter(([name, value]) => !covered.has(value) && !(name in NOT_A_PART))
      .map(
        ([name]) =>
          `部品 ${name} を測る Story がありません。src/stories/${name}.stories.tsx を作り、meta.component に ${name} を指定して parameters.layoutGate.parts を宣言してください。`,
      );
    pass(missing);
  });
});

for (const { file, module } of files) {
  const meta = module.default;
  const gate = meta.parameters?.layoutGate;
  if (!gate || !('parts' in gate)) continue;
  describe(`${meta.title}（${file}）`, () => {
    for (const combo of COMBOS)
      it(comboLabel(combo), async () => {
        const stories = composeStories(module, { initialGlobals: combo }) as unknown as Record<
          string,
          { run: () => Promise<void> }
        >;
        const failures: string[] = [];
        for (const [name, Story] of Object.entries(stories)) {
          await Story.run();
          await document.fonts.ready;
          await new Promise(requestAnimationFrame);
          const where = `[${meta.title} › ${name}｜${comboLabel(combo)}]`;
          for (const part of gate.parts) {
            const { found, violations } = checkPart(part, document.body);
            const key = `${meta.title} › ${part.name}`;
            if (!gate.screen) foundParts.set(key, (foundParts.get(key) ?? 0) + found);
            for (const v of violations) {
              const index = known(meta.title, v, combo);
              if (index >= 0) usedBaseline.add(index);
              else
                failures.push(
                  `${where} ${v.part}（${v.element}）の${CHECK_LABEL[v.check.split(' ')[0]]}：${v.message}`,
                );
            }
          }
          if (!gate.screen)
            for (const el of undeclared(gate.parts, document.body))
              failures.push(
                `${where} 操作の要素 ${el} が、どの部品の宣言にも入っていません。${file} の layoutGate.parts に、この要素を含む部品を足してください。`,
              );
        }
        measuredCombos.set(meta.title, (measuredCombos.get(meta.title) ?? 0) + 1);
        pass(failures);
      });
  });
}

describe('宣言と例外の後始末', () => {
  it('宣言した部品が、どれかの Story で描画されている', () => {
    pass(
      [...foundParts]
        .filter(([, n]) => n === 0)
        .map(
          ([key]) =>
            `部品「${key}」が、どの Story にも描画されていません。selector を確かめるか、その部品を描く Story を足してください。`,
        ),
    );
  });

  it('既知の例外（baseline.ts）がすべてまだ起きている', () => {
    // A filtered run only judges the stories it measured in every combination.
    const stale = BASELINE.filter(
      (b, i) => !usedBaseline.has(i) && measuredCombos.get(b.story) === COMBOS.length,
    ).map(
      (b) =>
        `baseline.ts の例外「${b.story} › ${b.part} › ${b.check}${b.when ? ` ${JSON.stringify(b.when)}` : ''}」はもう起きていません。直った部品の例外は一覧から消してください。`,
    );
    pass(stale);
  });
});
