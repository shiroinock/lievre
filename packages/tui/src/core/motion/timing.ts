// How long things move, from lievre's motion tokens (--lv-motion, --lv-ease in tokens.json).
//
// The web token is 140ms, which a terminal drawing 30 frames a second shows in only 4 or 5 frames:
// a sweep across a 40-column banner would jump 10 columns at a time. So the terminal keeps the
// token as the base length and never goes below MIN_FRAMES.
import tokenFile from '@lievre/tokens/tokens.json' with { type: 'json' };
import { cubicBezier, parseCubicBezier } from './ease.js';

const tokens = (tokenFile as unknown as { paper: Record<string, { $value: string }> }).paper;

/** `140ms` や `0.2s` をミリ秒にする。 */
export function parseDuration(value: string): number {
  const m = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value.trim());
  if (!m) throw new Error(`140ms や 0.2s の形で渡してください: ${value}`);
  return Number(m[1]) * (m[2] === 's' ? 1000 : 1);
}

/** `--lv-motion` の長さ（ミリ秒）。 */
export const MOTION_MS = parseDuration(tokens.motion.$value);
/** `--lv-ease` の曲線。 */
export const MOTION_EASE = parseCubicBezier(tokens.ease.$value);
/** `--lv-ease` を関数にしたもの。 */
export const ease = cubicBezier(MOTION_EASE);

/** 1秒に描くフレームの数。Ink が既定で描く上限（maxFps）と同じ。 */
export const FPS = 30;
/** 長さの決まった動きの、いちばん少ないフレームの数（30fps で約0.33秒）。 */
export const MIN_FRAMES = 10;
/** 動き続けるもの（光が流れる表示など）の1周のフレームの数（30fps で1.5秒）。 */
export const LOOP_FRAMES = 45;

/** 長さ（既定は `--lv-motion`）をフレームの数にする。MIN_FRAMES より少なくはしない。 */
export function frameCount(ms = MOTION_MS, fps = FPS): number {
  return Math.max(MIN_FRAMES, Math.ceil((ms * fps) / 1000));
}
