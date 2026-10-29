// 3つの土台で共通にする部分。KEI に入れるときは、ここが「KEI の側で持つ層」になる。
import {
  useCallback,
  useId,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { PortalSurface } from '../../../src/components/system';

export type ComboboxOption = {
  value: string;
  label: string;
  /** 読み（ひらがな）。漢字の名前を、変換前の読みでも探せるようにする。 */
  kana?: string;
  disabled?: boolean;
};

/** KEI の Combobox の props。Select と同じ形にして、土台の型は外に出さない。 */
export type ComboboxProps = {
  label: string;
  options: ComboboxOption[];
  /** 未選択は null。 */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** 一致する候補がないときの文。 */
  emptyText?: string;
  /** 試作だけの切り替え。false で IME の守りを外し、土台そのままの動きを見る。 */
  imeGuard?: boolean;
  /** 試作だけの切り替え。'radix' で重なりの枠を Radix の Popover にする。 */
  shell?: 'own' | 'radix';
};

const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 全角・半角（NFKC）、カタカナ・ひらがな、大文字・小文字、空白の違いを無視する。 */
export function normalize(s: string) {
  return toHiragana(s.normalize('NFKC')).toLowerCase().replace(/\s+/g, '');
}

export function filterOptions(options: ComboboxOption[], query: string) {
  const q = normalize(query);
  if (!q) return options;
  return options.filter(
    (o) =>
      normalize(o.label).includes(q) || (o.kana !== undefined && normalize(o.kana).includes(q)),
  );
}

/**
 * IME の変換中は絞り込みも確定もしない。
 * - 絞り込みは、確定した文字（query）でだけ行う。変換中の文字は入力欄に出るが、候補は変えない。
 * - Chrome は確定の Enter が isComposing=true で来る。Safari は compositionend のあとに
 *   isComposing=false・keyCode=229 の Enter が来る。どちらも土台に渡さない。
 */
export function useImeGuard(enabled: boolean, onCommit: (text: string) => void) {
  const composing = useRef(false);
  const onCompositionStart = useCallback(() => {
    composing.current = true;
  }, []);
  const onCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      onCommit(e.currentTarget.value);
    },
    [onCommit],
  );
  // 親の capture で止めると、土台が input に付けた onKeyDown に届かない。既定の動き（IME 自身）は止めない。
  const onKeyDownCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) e.stopPropagation();
    },
    [enabled],
  );
  const inputHandlers: {
    onCompositionStart?: () => void;
    onCompositionEnd?: (e: CompositionEvent<HTMLInputElement>) => void;
  } = enabled ? { onCompositionStart, onCompositionEnd } : {};
  return {
    composing,
    inputHandlers,
    wrapperHandlers: { onKeyDownCapture },
  };
}

/** 入力の文字と、絞り込みに使う確定済みの文字を分けて持つ。 */
export function useQuery(imeGuard: boolean) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const ime = useImeGuard(imeGuard, setQuery);
  const change = useCallback(
    (text: string) => {
      setInput(text);
      if (!imeGuard || !ime.composing.current) setQuery(text);
    },
    [imeGuard, ime.composing],
  );
  return { input, query, change, setBoth: (t: string) => (setInput(t), setQuery(t)), ime };
}

/** PortalSurface の中に、土台がポータルを描くための入れ物を作る。Radix の部品と同じく body の直下。 */
export function useSurfaceContainer() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const node = createPortal(
    <PortalSurface>
      <div ref={setEl} data-combobox-portal />
    </PortalSurface>,
    document.body,
  );
  return [el, node] as const;
}

/** FieldFrame（primitives.tsx）と同じ組み立て。本番では Field 部品を使う。 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  labelProps,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  labelProps?: object;
  children: ReactNode;
}) {
  return (
    <div className="k-field">
      <label className="k-label" htmlFor={id} {...labelProps}>
        {label}
        {required && (
          <span aria-hidden className="k-required">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-description`}
          className={error ? 'k-field-hint k-field-error' : 'k-field-hint'}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function useFieldIds() {
  const id = useId();
  return { id, listId: `${id}-list`, descriptionId: `${id}-description` };
}

export const partners: ComboboxOption[] = [
  { value: 'yamada', label: '株式会社ヤマダ製作所', kana: 'かぶしきがいしゃやまだせいさくしょ' },
  { value: 'tokyo', label: '東京商事株式会社', kana: 'とうきょうしょうじかぶしきがいしゃ' },
  { value: 'abc', label: 'ＡＢＣ物流', kana: 'えーびーしーぶつりゅう' },
  { value: 'sample', label: 'ｶﾌﾞｼｷｶﾞｲｼｬ ｻﾝﾌﾟﾙ', kana: 'かぶしきがいしゃさんぷる' },
  { value: 'hokkaido', label: '北海道ミルク合同会社', kana: 'ほっかいどうみるくごうどうがいしゃ' },
  { value: 'osaka', label: '大阪精機', kana: 'おおさかせいき' },
  { value: 'nagoya', label: '名古屋テクノ', kana: 'なごやてくの' },
  {
    value: 'fukuoka',
    label: '福岡システムズ（取引停止）',
    kana: 'ふくおかしすてむず',
    disabled: true,
  },
  { value: 'sendai', label: '仙台フーズ', kana: 'せんだいふーず' },
  { value: 'kobe', label: '神戸マリン', kana: 'こうべまりん' },
  { value: 'kyoto', label: '京都織物', kana: 'きょうとおりもの' },
  { value: 'yokohama', label: '横浜ロジスティクス', kana: 'よこはまろじすてぃくす' },
  { value: 'xyz', label: 'XYZ Trading', kana: 'えっくすわいぜっととれーでぃんぐ' },
  { value: 'hiroshima', label: '広島製鉄', kana: 'ひろしませいてつ' },
  { value: 'niigata', label: '新潟米穀', kana: 'にいがたべいこく' },
];

/**
 * 一覧の枠を Radix の Popover にする。重なり（Esc・外側を押したとき・ポインターの通り方・z-index）を
 * Select や Dialog と同じ仕組み（DismissableLayer）に乗せるため。開閉の状態は土台が持つ。
 */
export function RadixShell({
  open,
  onOpenChange,
  anchor,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const inside = (target: EventTarget | null) =>
    target instanceof Node &&
    !!(anchor.current?.contains(target) || content.current?.contains(target));
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={anchor as RefObject<HTMLElement>} />
      <PopoverPrimitive.Portal>
        <PortalSurface>
          <PopoverPrimitive.Content
            ref={content}
            role="presentation"
            className="k-combobox-popover"
            sideOffset={5}
            align="start"
            // 入力欄にフォーカスを残す。開閉で動かさない。
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            // 入力欄・開閉ボタン・一覧の中は「外側」にしない。Ariakit は一瞬だけ候補に本物のフォーカスを移すが、
            // Radix はそれを外側と見ることがあるので、DOM の包含で確かめ直す。Tab で外へ出たときは閉じる。
            onFocusOutside={(e) => inside(e.target) && e.preventDefault()}
            // Radix の Esc は document の capture で受け、isComposing を見ない。変換の取り消しの Esc で閉じないようにする。
            onEscapeKeyDown={(e) => (e.isComposing || e.keyCode === 229) && e.preventDefault()}
            onPointerDownOutside={(e) => inside(e.target) && e.preventDefault()}
          >
            {children}
          </PopoverPrimitive.Content>
        </PortalSurface>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
