import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { LiveWearFilters, liveAgeStyle, liveWearStyle } from '../wear/live';
import type { Age } from '../wear/age.mjs';
import { ThemeContext } from './theme-context';
import type { WearConfig } from '../wear/presets.mjs';

export type { WearConfig, Age };

export type Theme = 'paper' | 'ink';
/**
 * 試作：質感の段階。off は質感なし。baked はビルド時にソルトから焼いた模様を貼るだけで軽い。
 * live は wearSeed から SVG のフィルタを作り、文字も歪ませる。重い。
 */
export type Wear = 'off' | 'baked' | 'live';
export type Density = 'comfortable' | 'compact';
export type Typography = 'standard' | 'interface';
/** 書体の系統。sans は本文の書体（Lievre Sans）、mono は日本語も含めて等幅（Lievre Term JP）。 */
export type Family = 'sans' | 'mono';
export const cx = (...values: (string | false | undefined | null)[]) =>
  values.filter(Boolean).join(' ');
export function useLievreTheme() {
  return useContext(ThemeContext);
}
function useMedia(query: string) {
  return useSyncExternalStore(
    (change) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', change);
      return () => list.removeEventListener('change', change);
    },
    () => (typeof window !== 'undefined' && window.matchMedia?.(query).matches) || false,
    () => false,
  );
}
/** More contrast or forced colours. Both hooks run on every render, whichever matches. */
function usePlain() {
  const more = useMedia('(prefers-contrast: more)');
  const forced = useMedia('(forced-colors: active)');
  return more || forced;
}
/**
 * The wear actually drawn: off when the reader asks for more contrast or forced colours,
 * and baked instead of live when they ask for less motion.
 */
export function useEffectiveWear(wear: Wear): Wear {
  const plain = usePlain();
  const still = useMedia('(prefers-reduced-motion: reduce)');
  if (plain) return 'off';
  return wear === 'live' && still ? 'baked' : wear;
}
/** The age actually drawn: none when the reader asks for more contrast or forced colours. */
export function useEffectiveAge(age: Age): Age {
  return usePlain() ? 'none' : age;
}
/** すべての部品の配色と表示密度のスコープ。アプリのルートを包んで使います。部品のスタイルは `.lievre`（この部品が出す div）の内側でだけ効きます。 */
export function LievreProvider({
  theme: givenTheme,
  density: givenDensity,
  typography: givenTypography,
  family: givenFamily,
  wear: givenWear,
  wearSeed: givenWearSeed,
  wearConfig: givenWearConfig,
  age: givenAge,
  className,
  style,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  theme?: Theme;
  density?: Density;
  typography?: Typography;
  /**
   * 画面の書体。'sans'（既定）は本文の書体、'mono' は端末のように画面全体を等幅にします。日本語も含めて
   * 英数字 1 対日本語 2 の幅でそろい、中の部品もすべて等幅になります。文字の大きさ（typography）とは別に
   * 選べ、等幅では小さい文字も 14.4px（英数字が 12px に見える大きさ）より小さくしません。
   * 入れ子にすると、指定しない値は外側から引き継ぎます。等幅の画面の一部だけ本文の書体に戻すときは、
   * その範囲を `<LievreProvider family="sans">` で包みます。範囲だけを等幅にするなら、Text・Card の
   * `mono` を使います（中から開いたポップオーバーや入れ子の LievreProvider にも届きます）。クラス
   * `lv-family-mono` はその要素の中だけで、ポータルに出る部品と入れ子の LievreProvider には届きません。
   */
  family?: Family;
  /** 試作：質感の段階。既定は off。 */
  wear?: Wear;
  /**
   * 試作：live の模様を決めるソルト。既定は wear.config.json のソルトで、baked と同じ模様になります。
   * baked はビルド時の値（pnpm run wear）で決まります。
   */
  wearSeed?: string;
  /** 試作：live の強さ。既定は wear.config.json の値。調整の画面（pnpm run wear:tune）が使います。 */
  wearConfig?: WearConfig;
  /**
   * 試作：経年。none（既定）・light・heavy。褪色・インクのむら・罫線のかすれ・角の欠けを
   * 部品に渡します。入れ子にでき、質感（wear）とは別に効きます。状態（フォーカス・選択・エラー・無効）には
   * かけません。強いコントラストを求める設定と強制カラーモードでは none になります。
   */
  age?: Age;
}) {
  const inherited = useLievreTheme();
  const theme = givenTheme ?? inherited.theme;
  const density = givenDensity ?? inherited.density;
  const typography = givenTypography ?? inherited.typography;
  const family = givenFamily ?? inherited.family;
  const wearSeed = givenWearSeed ?? givenWearConfig?.salt ?? inherited.wearSeed;
  const baseConfig = givenWearConfig ?? inherited.wearConfig;
  const wearConfig = useMemo(() => ({ ...baseConfig, salt: wearSeed }), [baseConfig, wearSeed]);
  const wear = useEffectiveWear(givenWear ?? inherited.wear);
  const age = useEffectiveAge(givenAge ?? inherited.age);
  const prefix = 'kw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const wearStyle = useMemo(() => {
    const live = wear === 'live' ? liveWearStyle(prefix, wearConfig, theme) : undefined;
    // A provider given its own config draws age from it; otherwise the baked age.css applies.
    const aged =
      age !== 'none' && givenWearConfig ? liveAgeStyle(wearConfig, theme, age) : undefined;
    return live || aged ? { ...live, ...aged } : undefined;
  }, [wear, prefix, wearConfig, theme, age, givenWearConfig]);
  return (
    <ThemeContext.Provider
      value={{ theme, density, typography, family, wear, wearSeed, wearConfig, wearStyle, age }}
    >
      <div
        {...props}
        className={cx('lievre', className)}
        style={wearStyle ? { ...wearStyle, ...style } : style}
        data-theme={theme}
        data-density={density}
        data-typography={typography}
        data-family={family}
        data-wear={wear}
        data-wear-seed={wear === 'live' ? wearSeed : undefined}
        data-age={age}
      >
        {children}
        {wear === 'live' && <LiveWearFilters prefix={prefix} config={wearConfig} />}
      </div>
    </ThemeContext.Provider>
  );
}
export function PortalSurface({ children }: { children: ReactNode }) {
  const { theme, density, typography, family, wear, wearStyle, age } = useLievreTheme();
  return (
    <div
      className="lievre lievre-portal"
      style={wearStyle}
      data-theme={theme}
      data-density={density}
      data-typography={typography}
      data-family={family}
      data-wear={wear}
      data-age={age}
    >
      {children}
    </div>
  );
}
export type ToastMessage = {
  /** 何が起きたかを短く（「設定を保存しました」）。 */
  title: string;
  description?: string;
  /** 既定は 'success'。失敗は 'error'（Badge・Alert の 'danger' とは名前が違います）。'info' は知らせ、'warning' は注意。どれもアイコンと title の言葉で状態を伝えます。 */
  tone?: 'success' | 'error' | 'info' | 'warning';
  /**
   * 通知の中に置く操作（「元に戻す」など）。渡すと、利用者が操作できるように通知は自動で消えなくなります（閉じるボタンかスワイプで閉じます）。
   * altText には、通知の外で同じ操作ができる場所を書きます（「履歴の画面から元に戻せます」）。通知の操作ボタンへ移れない読み上げの利用者に、代わりとして読み上げます。
   * 押すと onClick を呼んでから通知を閉じます。
   */
  action?: { label: string; altText: string; onClick: () => void };
};
const ToastContext = createContext<((message: ToastMessage) => void) | null>(null);
/** ToastProviderの子孫で使用します。保存結果や一時的な通知向け。`const toast = useToast(); toast({ title: '保存しました' })` */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx)
    throw new Error(
      'useToast は ToastProvider の内側で呼んでください：<LievreProvider><ToastProvider>{app}</ToastProvider></LievreProvider>',
    );
  return ctx;
}
function ToastIcon({ tone }: { tone?: ToastMessage['tone'] }) {
  const Icon =
    tone === 'error'
      ? AlertCircle
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'info'
          ? Info
          : CheckCircle2;
  return <Icon size={20} aria-hidden />;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ToastContext);
  const [messages, setMessages] = useState<(ToastMessage & { id: number })[]>([]);
  // Nested patterns share the nearest host instead of creating duplicate notification landmarks.
  if (parent) return <>{children}</>;
  return (
    <ToastContext.Provider
      value={(message) =>
        setMessages((prev) => [...prev, { ...message, id: Date.now() + Math.random() }])
      }
    >
      <ToastPrimitive.Provider duration={5000} swipeDirection="right">
        {children}
        {messages.map((message) => (
          <ToastPrimitive.Root
            className="lv-toast"
            data-tone={message.tone ?? 'success'}
            key={message.id}
            // An action needs time to reach (WCAG 2.2.1), so a toast with one stays until closed.
            duration={message.action ? Infinity : undefined}
            onOpenChange={(open) => {
              if (!open) setMessages((prev) => prev.filter((t) => t.id !== message.id));
            }}
          >
            <ToastIcon tone={message.tone} />
            <div>
              <ToastPrimitive.Title className="lv-toast-title">
                {message.title}
              </ToastPrimitive.Title>
              {message.description && (
                <ToastPrimitive.Description className="lv-toast-description">
                  {message.description}
                </ToastPrimitive.Description>
              )}
              {message.action && (
                <div className="lv-toast-actions">
                  <ToastPrimitive.Action
                    className="lv-button lv-button--secondary lv-button--sm"
                    altText={message.action.altText}
                    onClick={message.action.onClick}
                  >
                    {message.action.label}
                  </ToastPrimitive.Action>
                </div>
              )}
            </div>
            <ToastPrimitive.Close className="lv-icon-button" aria-label="通知を閉じる">
              <X size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="lv-toast-viewport" label="通知 ({hotkey})" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
