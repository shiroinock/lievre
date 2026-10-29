import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from 'react-aria-components';
import '../../../src/styles/fonts.css';
import '../../../src/styles/kei.css';
import './spike.css';
import './datepicker.css';
import { KeiProvider, type Theme } from '../../../src/components/system';
import { Button, Select } from '../../../src/components/primitives';
import { Dialog } from '../../../src/components/dialog';
import { AriaCombobox } from './AriaCombobox';
import { AriakitCombobox } from './AriakitCombobox';
import { AriaDatePicker } from './AriaDatePicker';
import { DownshiftCombobox } from './DownshiftCombobox';
import { partners, type ComboboxProps } from './shared';

// ?impl=aria|ariakit|downshift|select|datepicker &shell=own|radix &ctx=plain|dialog &guard=0 &theme=ink &error=1
const params = new URLSearchParams(location.search);
const impl = params.get('impl') ?? 'aria';
const shell = (params.get('shell') ?? 'own') as ComboboxProps['shell'];
const ctx = params.get('ctx') ?? 'plain';
const imeGuard = params.get('guard') !== '0';
const theme = (params.get('theme') ?? 'paper') as Theme;

const impls = { aria: AriaCombobox, ariakit: AriakitCombobox, downshift: DownshiftCombobox };

function Field() {
  const [value, setValue] = useState<string | null>(null);
  const common: ComboboxProps = {
    label: '取引先',
    options: partners,
    value,
    onValueChange: setValue,
    placeholder: '名前か読みで探す',
    hint: '社名の一部か、ひらがなの読みで探せます',
    error: params.get('error') ? '取引先を選んでください' : undefined,
    required: true,
    imeGuard,
    shell,
  };
  if (impl === 'datepicker') return <AriaDatePicker wareki={params.get('wareki') === '1'} />;
  if (impl === 'select')
    return (
      <>
        <Select
          label="取引先"
          options={partners}
          value={value ?? ''}
          onValueChange={setValue}
          hint="社名の一部か、ひらがなの読みで探せます"
        />
        <output data-testid="value">{value ?? ''}</output>
      </>
    );
  const Impl = impls[impl as keyof typeof impls];
  return (
    <>
      <Impl {...common} />
      <output data-testid="value">{value ?? ''}</output>
    </>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const [clicks, setClicks] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 32, display: 'grid', gap: 24, maxWidth: 420, alignContent: 'start' }}>
      <p className="k-field-hint">
        impl={impl} shell={shell} ctx={ctx} guard={String(imeGuard)}
      </p>
      <Button variant="secondary" data-testid="outside" onClick={() => setClicks((n) => n + 1)}>
        外側のボタン（<span data-testid="clicks">{clicks}</span>）
      </Button>
      {ctx === 'dialog' ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          trigger={<Button data-testid="dialog-trigger">取引先を設定</Button>}
          title="取引先を設定"
          description="請求書の宛先にする取引先を選びます。"
        >
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 一覧は下に開くので、押す的は上に置いて一覧に隠れないようにする。 */}
            <Button variant="secondary" data-testid="inside">
              ダイアログの中のボタン
            </Button>
            {children}
          </div>
        </Dialog>
      ) : (
        children
      )}
      <input className="k-input" data-testid="after" aria-label="次の欄" />
      <p data-testid="dialog-state">{open ? 'dialog-open' : 'dialog-closed'}</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider locale="ja-JP">
      <KeiProvider theme={theme} style={{ minHeight: '100vh', background: 'var(--k-bg)' }}>
        <Frame>
          <Field />
        </Frame>
      </KeiProvider>
    </I18nProvider>
  </StrictMode>,
);
