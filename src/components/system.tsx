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
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { LiveWearFilters, liveAgeStyle, liveWearStyle } from '../wear/live';
import type { Age } from '../wear/age.mjs';
import { WEAR_CONFIG } from '../wear/params.mjs';
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
export const cx = (...values: (string | false | undefined | null)[]) =>
  values.filter(Boolean).join(' ');
const ThemeContext = createContext<{
  theme: Theme;
  density: Density;
  typography: Typography;
  wear: Wear;
  wearSeed: string;
  wearConfig: WearConfig;
  wearStyle?: CSSProperties;
  age: Age;
}>({
  theme: 'paper',
  density: 'comfortable',
  typography: 'standard',
  wear: 'off',
  wearSeed: WEAR_CONFIG.salt,
  wearConfig: WEAR_CONFIG,
  age: 'none',
});
export function useKeiTheme() {
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
/**
 * The wear actually drawn: off when the reader asks for more contrast or forced colours,
 * and baked instead of live when they ask for less motion.
 */
export function useEffectiveWear(wear: Wear): Wear {
  const plain = useMedia('(prefers-contrast: more)') || useMedia('(forced-colors: active)');
  const still = useMedia('(prefers-reduced-motion: reduce)');
  if (plain) return 'off';
  return wear === 'live' && still ? 'baked' : wear;
}
/** The age actually drawn: none when the reader asks for more contrast or forced colours. */
export function useEffectiveAge(age: Age): Age {
  const plain = useMedia('(prefers-contrast: more)') || useMedia('(forced-colors: active)');
  return plain ? 'none' : age;
}
/** すべての部品の配色と表示密度のスコープ。アプリのルートを包んで使います。部品のスタイルは `.kei`（この部品が出す div）の内側でだけ効きます。 */
export function KeiProvider({
  theme: givenTheme,
  density: givenDensity,
  typography: givenTypography,
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
  /** 試作：質感の段階。既定は off。 */
  wear?: Wear;
  /**
   * 試作：live の模様を決めるソルト。既定は wear.config.json のソルトで、baked と同じ模様になります。
   * baked はビルド時の値（npm run wear）で決まります。
   */
  wearSeed?: string;
  /** 試作：live の強さ。既定は wear.config.json の値。調整の画面（npm run wear:tune）が使います。 */
  wearConfig?: WearConfig;
  /**
   * 試作：経年。none（既定）・light・heavy。褪色・インクのむら・罫線のかすれ・角の欠けを
   * 部品に渡します。入れ子にでき、質感（wear）とは別に効きます。状態（フォーカス・選択・エラー・無効）には
   * かけません。強いコントラストを求める設定と強制カラーモードでは none になります。
   */
  age?: Age;
}) {
  const inherited = useKeiTheme();
  const theme = givenTheme ?? inherited.theme;
  const density = givenDensity ?? inherited.density;
  const typography = givenTypography ?? inherited.typography;
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
      value={{ theme, density, typography, wear, wearSeed, wearConfig, wearStyle, age }}
    >
      <div
        {...props}
        className={cx('kei', className)}
        style={wearStyle ? { ...wearStyle, ...style } : style}
        data-theme={theme}
        data-density={density}
        data-typography={typography}
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
  const { theme, density, typography, wear, wearStyle, age } = useKeiTheme();
  return (
    <div
      className="kei kei-portal"
      style={wearStyle}
      data-theme={theme}
      data-density={density}
      data-typography={typography}
      data-wear={wear}
      data-age={age}
    >
      {children}
    </div>
  );
}
export type ToastMessage = {
  title: string;
  description?: string;
  /** 既定は 'success'。失敗は 'error'（Badge・Alert の 'danger' とは名前が違います）。 */
  tone?: 'success' | 'error';
};
const ToastContext = createContext<((message: ToastMessage) => void) | null>(null);
/** ToastProviderの子孫で使用します。保存結果や一時的な通知向け。`const toast = useToast(); toast({ title: '保存しました' })` */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx)
    throw new Error(
      'useToast は ToastProvider の内側で呼んでください：<KeiProvider><ToastProvider>{app}</ToastProvider></KeiProvider>',
    );
  return ctx;
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
            className="k-toast"
            data-tone={message.tone ?? 'success'}
            key={message.id}
            onOpenChange={(open) => {
              if (!open) setMessages((prev) => prev.filter((t) => t.id !== message.id));
            }}
          >
            {message.tone === 'error' ? (
              <AlertCircle size={20} aria-hidden />
            ) : (
              <CheckCircle2 size={20} aria-hidden />
            )}
            <div>
              <ToastPrimitive.Title className="k-toast-title">{message.title}</ToastPrimitive.Title>
              {message.description && (
                <ToastPrimitive.Description className="k-toast-description">
                  {message.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="k-icon-button" aria-label="通知を閉じる">
              <X size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="k-toast-viewport" label="通知 ({hotkey})" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
