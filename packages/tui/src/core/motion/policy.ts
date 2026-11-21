// Whether to move at all. The person using the terminal decides, and anything that cannot show
// motion well gets none:
//
// off     — no picture and no motion, only one line of words: screen readers (INK_SCREEN_READER),
//           output that is not a terminal, TERM=dumb, CI, or LIEVRE_MOTION=off.
// reduced — the picture without motion: entrances show their last frame at once, loops start
//           paused (and can be resumed). LIEVRE_MOTION=reduced.
// full    — moves; entrances can be skipped and loops paused with a key.

/** 動かすか。`full`（動かす）・`reduced`（止めた絵）・`off`（1行の言葉だけ）。 */
export type MotionPolicy = 'full' | 'reduced' | 'off';

const truthy = (value: string | undefined) =>
  value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';

/**
 * 環境から動かし方を決める。`LIEVRE_MOTION=full` を指定しても、スクリーンリーダー・端末でない出力・
 * `TERM=dumb`・CI では動かさない。
 */
export function motionPolicy(
  env: Record<string, string | undefined> = process.env,
  {
    isTTY = Boolean(process.stdout.isTTY),
    screenReader,
  }: { isTTY?: boolean; screenReader?: boolean } = {},
): MotionPolicy {
  if (screenReader ?? env.INK_SCREEN_READER === 'true') return 'off';
  if (!isTTY || env.TERM === 'dumb' || truthy(env.CI)) return 'off';
  const asked = env.LIEVRE_MOTION?.toLowerCase();
  if (asked === 'off') return 'off';
  if (asked === 'reduced') return 'reduced';
  return 'full';
}
