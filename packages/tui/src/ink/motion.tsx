// Motion drawn with Ink. Ink keeps the clock (useAnimation: one shared timer, and only the changed
// part of a changed line is written), so frames never clear the screen. The rules — which frame,
// what a key does, whether to move at all — live in core/motion.
//
// Draw-only parts (Frame) take a grid; the moving parts (Animation, Banner, Loading) also take
// keys: Enter, Esc or Space skips an entrance, P or Space pauses and resumes a loop.
import {
  Box,
  Text,
  useAnimation,
  useInput,
  useIsScreenReaderEnabled,
  useStdin,
  useStdout,
} from 'ink';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Palette } from '../core/palette.js';
import {
  ENTRANCES,
  FPS,
  LOOP_FRAMES,
  frameAt,
  frameCount,
  isDone,
  isRunning,
  makeGrid,
  motionAction,
  motionPolicy,
  phase as loopPhase,
  progress as easedProgress,
  runs,
  shimmer,
  skipPlayback,
  startPlayback,
  togglePlayback,
  type Entrance,
  type EntranceName,
  type Grid,
  type MotionPolicy,
  type MotionRole,
} from '../core/motion/index.js';
import { useLievre } from './components.js';

/**
 * 環境から決めた動かし方。Ink のスクリーンリーダーの設定と、出力が端末かを見る。
 * 中身は core の `motionPolicy`。
 */
export function useMotionPolicy(): MotionPolicy {
  const screenReader = useIsScreenReaderEnabled();
  const { stdout } = useStdout();
  const isTTY = Boolean((stdout as NodeJS.WriteStream | undefined)?.isTTY);
  return motionPolicy(process.env, { isTTY, screenReader });
}

export type FramesOptions = {
  /** フレームの数。省くと、入り方は `frameCount()`（`--lv-motion` と最低のフレーム数）、loop は `LOOP_FRAMES`。 */
  frames?: number;
  /** 動き続けるか。true なら止める・再開するキー、false なら飛ばすキーを受ける。 */
  loop?: boolean;
  /** 動かし方。省くと `useMotionPolicy()` で環境から決める。 */
  policy?: MotionPolicy;
  /** キーを受けるか。入力欄にいるあいだなどは false にする。 */
  keys?: boolean;
  /** 入り方が最後のフレームまで来たとき（飛ばしたときも）に1回呼ぶ。 */
  onDone?: () => void;
};

export type FrameControls = {
  /** 描くフレーム（0 〜 frames - 1）。 */
  frame: number;
  frames: number;
  /** 入り方の進み具合（0〜1、`--lv-ease` に沿う）。 */
  progress: number;
  /** loop の位相（0〜1）。 */
  phase: number;
  /** 入り方が終わったか。loop では false のまま。 */
  done: boolean;
  /** loop を止めているか。 */
  paused: boolean;
  policy: MotionPolicy;
  /** キーを受けているか（keys が true で、端末がキーを渡せて、まだ動いているとき）。 */
  listening: boolean;
  /** 最後のフレームへ飛ばす。 */
  skip: () => void;
  /** 止める・再開する。 */
  toggle: () => void;
};

/**
 * フレームを進める。時計は Ink の `useAnimation`（30fps）で、止めたとき・終わったときは
 * 時計も止める（描き直さない）。動きを減らす設定では、入り方は最後のフレーム、loop は止めた状態で始める。
 */
export function useFrames({
  frames,
  loop = false,
  policy,
  keys = true,
  onDone,
}: FramesOptions = {}): FrameControls {
  const auto = useMotionPolicy();
  const mode = policy ?? auto;
  const timeline = { frames: Math.max(1, frames ?? (loop ? LOOP_FRAMES : frameCount())), loop };
  const [playback, setPlayback] = useState(() => startPlayback(timeline, mode));
  // The clock's count, kept for the next decision: whether it still runs depends on it.
  const elapsed = useRef(0);
  const running = mode !== 'off' && isRunning(timeline, playback, elapsed.current);
  const clock = useAnimation({ interval: 1000 / FPS, isActive: running });
  if (running) elapsed.current = clock.frame;
  const frame = frameAt(timeline, playback, elapsed.current);
  const done = isDone(timeline, playback, elapsed.current);

  const told = useRef(false);
  useEffect(() => {
    if (done && !told.current) {
      told.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  const skip = () => setPlayback((p) => skipPlayback(timeline, p));
  const toggle = () => {
    setPlayback((p) => togglePlayback(timeline, p, elapsed.current));
    elapsed.current = 0;
  };

  // Ink throws when it turns on raw mode for a stdin that cannot take it (a pipe), so keys are
  // only read when the terminal can give them.
  const { isRawModeSupported } = useStdin();
  const listening = keys && isRawModeSupported && mode !== 'off' && !done;
  useInput(
    (input, key) => {
      if (key.ctrl || key.meta) return;
      const action = motionAction(timeline, input, key);
      if (action === 'skip') skip();
      if (action === 'toggle') toggle();
    },
    { isActive: listening },
  );

  return {
    frame,
    frames: timeline.frames,
    progress: easedProgress(timeline, frame),
    phase: loopPhase(timeline, frame),
    done,
    paused: playback.paused,
    policy: mode,
    listening,
    skip,
    toggle,
  };
}

/**
 * 役割を色にする。色の値を知っている段階（truecolor・256色）だけ色を付け、16色と色なしでは
 * 端末の字の色のままにする。強調（accent）だけは太字にして、帯や先頭が見えるようにする。
 */
function roleStyle(p: Palette, role: MotionRole) {
  return p.paints ? { color: p[role] } : { bold: role === 'accent' };
}

/**
 * 1枚の絵を描く。面（surface）の上に描くので、色の組は検査した値どうしになる。
 * 読み上げでは絵を読まず、label だけを読む。
 */
export function Frame({ grid, label }: { grid: Grid; label: string }) {
  const { p } = useLievre();
  return (
    // The width is fixed so that a blank cell at the end of a line still holds its place (Ink drops
    // trailing spaces that have no background, as with 16 colors or none).
    <Box flexDirection="column" width={grid.width} flexShrink={0} aria-label={label}>
      {grid.rows.map((row, y) => (
        <Text key={y} backgroundColor={p.surface}>
          {runs(row).map((run, i) => (
            <Text key={i} {...roleStyle(p, run.role)}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

export type AnimationProps = Omit<FramesOptions, 'loop'> & {
  /** 描く絵。 */
  grid: Grid;
  /** 入り方。名前（`sweep` など）か、`(grid, t) => grid` の関数。 */
  effect?: EntranceName | Entrance;
  /** 絵の代わりに読む言葉。動かさないとき（`off`）は、この1行だけを出す。 */
  label: string;
};

/** 長さの決まった入り方で絵を出す。最後のフレームで止まり、渡した絵のままになる。 */
export function Animation({ grid, effect = 'sweep', label, ...options }: AnimationProps) {
  const { p } = useLievre();
  const controls = useFrames(options);
  if (controls.policy === 'off') return <Text color={p.text}>{label}</Text>;
  const fn = typeof effect === 'function' ? effect : ENTRANCES[effect];
  return <Frame grid={fn(grid, controls.progress)} label={label} />;
}

export type BannerProps = Omit<AnimationProps, 'grid'> & {
  /** 絵の文字。行の配列か、改行で区切った文字列。幅が曖昧な字は使えない。 */
  art: string | readonly string[];
  /** 絵の役割。既定は `text`。 */
  role?: MotionRole;
};

/** 起動のバナー。既定では左から掃くように出し、キーで飛ばせる。 */
export function Banner({ art, role = 'text', ...props }: BannerProps) {
  return <Animation grid={makeGrid(art, role)} {...props} />;
}

const TONES = { ok: 'success', warn: 'warning', stop: 'danger' } as const;

export type LoadingProps = Omit<FramesOptions, 'loop' | 'onDone'> & {
  /** 待っているあいだの言葉（「取り込んでいます」など）。 */
  label: string;
  /** 終わったときの1行。渡すと動きを止め、記号とこの言葉だけを出す。 */
  result?: string;
  /** 結果の種類。記号と色になる。 */
  tone?: 'ok' | 'warn' | 'stop';
  /** 止める・再開するキーの案内を出すか。 */
  hint?: boolean;
  /** 言葉のあとに足すもの（「12 / 40 件」など）。 */
  children?: ReactNode;
};

/**
 * 読み込み中の表示。言葉の上を光の帯が流れる。字は描き直さず、帯の色だけが動く。
 * 終わったら result の1行に替わる。読み上げと端末でない出力では、言葉を1回だけ出す。
 */
export function Loading({
  label,
  result,
  tone = 'ok',
  hint = true,
  children,
  ...options
}: LoadingProps) {
  const { p, g } = useLievre();
  if (result !== undefined) {
    const color = p[TONES[tone]];
    return (
      <Text>
        <Text color={color} bold>
          {g[tone]}
        </Text>
        <Text color={p.paints ? color : undefined}> {result}</Text>
      </Text>
    );
  }
  return (
    <LoadingLine label={label} hint={hint} options={options}>
      {children}
    </LoadingLine>
  );
}

function LoadingLine({
  label,
  hint,
  options,
  children,
}: {
  label: string;
  hint: boolean;
  options: Omit<FramesOptions, 'loop' | 'onDone'>;
  children?: ReactNode;
}) {
  const { p } = useLievre();
  const controls = useFrames({ ...options, loop: true });
  if (controls.policy === 'off')
    return (
      <Text color={p.text}>
        {label}
        {children}
      </Text>
    );
  const grid = shimmer()(makeGrid(label, 'text', { ambiguous: 'allow' }), controls.phase);
  return (
    <Box gap={2}>
      <Box>
        <Frame grid={grid} label={label} />
        {children}
      </Box>
      {hint && controls.listening && (
        <Text color={p.muted} aria-hidden>
          {controls.paused ? '[P] 再開する' : '[P] 止める'}
        </Text>
      )}
    </Box>
  );
}
