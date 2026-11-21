// The frame to draw, as a pure function of the playback state and the frames counted since the
// clock last started. The drawing layer owns the clock (Ink's useAnimation); this file decides
// what the frame is, what a key does, and when the motion is over.
import type { MotionPolicy } from './policy.js';
import { ease as tokenEase } from './timing.js';

/** 動きの形。entrance は長さが決まっていて最後のフレームで止まる。loop は動き続ける。 */
export type Timeline = { frames: number; loop: boolean };

/** 再生の状態。base は止めたときのフレーム（loop だけ）。 */
export type Playback = { base: number; paused: boolean; skipped: boolean };

/** 始めの状態。動かさないとき、入り方は最後のフレームから、loop は止めた状態から始める。 */
export function startPlayback(timeline: Timeline, policy: MotionPolicy): Playback {
  const still = policy !== 'full';
  return { base: 0, paused: still && timeline.loop, skipped: still && !timeline.loop };
}

/** 描くフレーム（0 〜 frames - 1）。elapsed は時計が最後に動き出してから数えたフレーム。 */
export function frameAt(timeline: Timeline, playback: Playback, elapsed: number): number {
  const last = Math.max(0, timeline.frames - 1);
  if (!timeline.loop) return playback.skipped ? last : Math.min(last, Math.max(0, elapsed));
  const n = playback.base + (playback.paused ? 0 : Math.max(0, elapsed));
  return n % Math.max(1, timeline.frames);
}

/** 入り方が最後のフレームまで来たか。loop は終わらない。 */
export function isDone(timeline: Timeline, playback: Playback, elapsed: number): boolean {
  return !timeline.loop && frameAt(timeline, playback, elapsed) >= timeline.frames - 1;
}

/** 時計を動かすか。止めたとき・終わったときは動かさない（描き直さない）。 */
export function isRunning(timeline: Timeline, playback: Playback, elapsed: number): boolean {
  return timeline.loop ? !playback.paused : !isDone(timeline, playback, elapsed);
}

/** 止める・再開する（loop だけ）。止めたフレームを base に残す。再開すると時計は 0 から数え直す。 */
export function togglePlayback(timeline: Timeline, playback: Playback, elapsed: number): Playback {
  if (!timeline.loop) return playback;
  return playback.paused
    ? { ...playback, paused: false }
    : { ...playback, base: frameAt(timeline, playback, elapsed), paused: true };
}

/** 最後のフレームへ飛ばす（入り方だけ）。 */
export function skipPlayback(timeline: Timeline, playback: Playback): Playback {
  return timeline.loop ? playback : { ...playback, skipped: true };
}

/** 入り方の進み具合（0〜1）。既定では `--lv-ease` の曲線に沿わせる。 */
export function progress(
  timeline: Timeline,
  frame: number,
  curve: (t: number) => number = tokenEase,
): number {
  return timeline.frames <= 1 ? 1 : curve(frame / (timeline.frames - 1));
}

/** loop の位相（0〜1）。 */
export const phase = (timeline: Timeline, frame: number) => frame / Math.max(1, timeline.frames);

/** 押されたキー。Ink の useInput の key のうち、使うものだけ。 */
export type MotionKey = { return?: boolean; escape?: boolean };

/** キーの割り当て。入り方は Enter・Esc・空白で飛ばし、loop は P・空白で止める・再開する。 */
export const MOTION_KEYS = { skip: ['Enter', 'Esc', 'Space'], toggle: ['P', 'Space'] } as const;

/** 押されたキーで何をするか。関係のないキーなら undefined。 */
export function motionAction(
  timeline: Timeline,
  input: string,
  key: MotionKey = {},
): 'skip' | 'toggle' | undefined {
  if (timeline.loop) return input === ' ' || input.toLowerCase() === 'p' ? 'toggle' : undefined;
  return key.return || key.escape || input === ' ' ? 'skip' : undefined;
}
