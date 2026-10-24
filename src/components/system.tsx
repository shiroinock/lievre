import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

/** sepia と rust は試作のテーマです。 */
export type Theme = 'paper' | 'ink' | 'sepia' | 'rust';
/** 試作：worn は紙の粒・刷りのずれ・擦れた罫線を加えます。 */
export type Wear = 'clean' | 'worn';
export type Density = 'comfortable' | 'compact';
export type Typography = 'standard' | 'interface';
export const cx = (...values: (string | false | undefined | null)[]) =>
  values.filter(Boolean).join(' ');
const ThemeContext = createContext<{
  theme: Theme;
  density: Density;
  typography: Typography;
  wear: Wear;
}>({
  theme: 'paper',
  density: 'comfortable',
  typography: 'standard',
  wear: 'clean',
});
export function useKeiTheme() {
  return useContext(ThemeContext);
}
/** すべての部品の配色と表示密度のスコープ。アプリのルートを包んで使います。 */
export function KeiProvider({
  theme: givenTheme,
  density: givenDensity,
  typography: givenTypography,
  wear: givenWear,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  theme?: Theme;
  density?: Density;
  typography?: Typography;
  wear?: Wear;
}) {
  const inherited = useKeiTheme();
  const theme = givenTheme ?? inherited.theme;
  const density = givenDensity ?? inherited.density;
  const typography = givenTypography ?? inherited.typography;
  const wear = givenWear ?? inherited.wear;
  return (
    <ThemeContext.Provider value={{ theme, density, typography, wear }}>
      <div
        {...props}
        className={cx('kei', className)}
        data-theme={theme}
        data-density={density}
        data-typography={typography}
        data-wear={wear}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
export function PortalSurface({ children }: { children: ReactNode }) {
  const { theme, density, typography, wear } = useKeiTheme();
  return (
    <div
      className="kei kei-portal"
      data-theme={theme}
      data-density={density}
      data-typography={typography}
      data-wear={wear}
    >
      {children}
    </div>
  );
}
type ToastMessage = { title: string; description?: string; tone?: 'success' | 'error' };
const ToastContext = createContext<((message: ToastMessage) => void) | null>(null);
/** ToastProviderの子孫で使用します。保存結果や一時的な通知向け。 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
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
              <AlertCircle size={18} aria-hidden />
            ) : (
              <CheckCircle2 size={18} aria-hidden />
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
