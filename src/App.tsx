import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  CircleDot,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Ruler,
  Sun,
  X,
} from 'lucide-react';
import {
  Tabs,
  Badge,
  Button,
  Card,
  KeiProvider,
  Meter,
  Metric,
  Progress,
  ToastProvider,
  type Theme,
  type Density,
  IconButton,
} from './index';
import { ComponentGallery } from './docs/ComponentGallery';
import { ColorFoundation, Foundations, ReferenceDirection, principles } from './docs/Foundations';
import { OperationsExample, SettingsExample } from './patterns/Operations';
import { ResourceLibrary, ArticleExample, RegistrationExample } from './patterns/Everyday';
import './styles/demo.css';

const version = '0.2.0';
type Page = 'overview' | 'foundations' | 'components' | 'patterns' | 'references';
const pages: { id: Page; label: string; lead: string; icon: typeof Box }[] = [
  { id: 'overview', label: 'はじめに', lead: '', icon: LayoutDashboard },
  {
    id: 'foundations',
    label: 'デザインの基礎',
    lead: '設計原則と、色・文字・余白のトークン。部品はすべてこの値から組み立てています。',
    icon: Ruler,
  },
  {
    id: 'components',
    label: 'コンポーネント',
    lead: '入力・選択・通知・データ表示の部品。ここでは主な状態を操作して確かめられます。',
    icon: Box,
  },
  {
    id: 'patterns',
    label: '画面パターン',
    lead: '探す・読む・申し込む・管理する。部品を組み合わせた画面の例です。',
    icon: Layers3,
  },
  {
    id: 'references',
    label: '参考と方向性',
    lead: '81枚の参考画像から、何を取り入れ、何を取り入れなかったか。',
    icon: CircleDot,
  },
];
export const storybookUrl = import.meta.env.DEV ? 'http://127.0.0.1:6006/' : './storybook/';
function Mark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M4 4H11V11H4ZM17 4H24V11H17ZM4 17H11V24H4Z" fill="currentColor" />
      <path d="M17 17H24V24H17Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
/** The overview's sample panel: real components on the ultramarine instrument face. */
function InstrumentPanel() {
  return (
    <section className="instrument-panel" aria-label="計器表示のサンプル">
      <header>
        <h2>計測ラボ</h2>
        <Badge tone="success" dot>
          稼働中
        </Badge>
      </header>
      <div className="instrument-panel-body">
        <Meter value={68} label="リソース使用率" />
        <Metric
          label="処理の成功率"
          value="99.2"
          unit="%"
          change="前週比 +0.8%"
          trend="up"
          values={[80, 83, 82, 85, 83, 88, 86, 91, 90, 95, 94, 99]}
        />
      </div>
      <div className="instrument-panel-bars">
        <Progress value={42} label="CPU" />
        <Progress value={31} label="ストレージ" />
      </div>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('paper');
  const [density, setDensity] = useState<Density>('comfortable');
  const [page, setPage] = useState<Page>('overview');
  const [navOpen, setNavOpen] = useState(false);
  const active = pages.find((p) => p.id === page)!;
  const menuRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width:760px)');
    const onChange = () => {
      if (!mq.matches) setNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  useEffect(() => {
    if (!navOpen) return;
    const pane = navigationRef.current;
    if (!pane) return;
    const targets = () =>
      Array.from(
        pane.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],select:not(:disabled)'),
      ).filter(
        (el) =>
          getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden',
      );
    targets()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setNavOpen(false);
      }
      if (event.key === 'Tab') {
        const items = targets();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    pane.addEventListener('keydown', key);
    return () => {
      pane.removeEventListener('keydown', key);
      menuRef.current?.focus();
    };
  }, [navOpen]);

  function go(id: Page) {
    setPage(id);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  return (
    <KeiProvider theme={theme} density={density} className="kei-app">
      <ToastProvider>
        <a href="#main" className="skip-link">
          本文へスキップ
        </a>
        <aside
          ref={navigationRef}
          id="app-navigation"
          role={navOpen ? 'dialog' : undefined}
          aria-modal={navOpen || undefined}
          aria-label={navOpen ? 'ナビゲーション' : undefined}
          className={`app-sidebar ${navOpen ? 'is-open' : ''}`}
        >
          <div className="brand">
            <span className="brand-mark">
              <Mark />
            </span>
            <div>
              <strong>KEI</strong>
              <small>デザインシステム</small>
            </div>
            <IconButton
              className="sidebar-close"
              size="sm"
              label="メニューを閉じる"
              icon={<X />}
              tooltip={false}
              onClick={() => setNavOpen(false)}
            />
          </div>
          <nav aria-label="メインナビゲーション" className="main-nav">
            {pages.map((p) => (
              <button
                key={p.id}
                onClick={() => go(p.id)}
                aria-current={page === p.id ? 'page' : undefined}
              >
                <p.icon size={16} aria-hidden />
                <span>{p.label}</span>
              </button>
            ))}
          </nav>
          <a className="sidebar-link" href={storybookUrl} target="_blank" rel="noreferrer">
            <BookOpen size={16} aria-hidden />
            <span>
              Storybook
              <small>props・状態・アクセシビリティ</small>
            </span>
            <ArrowUpRight size={14} aria-hidden />
          </a>
          <div className="sidebar-bottom">
            <div className="theme-segment" role="group" aria-label="配色">
              <button aria-pressed={theme === 'paper'} onClick={() => setTheme('paper')}>
                <Sun size={14} aria-hidden />
                Paper
              </button>
              <button aria-pressed={theme === 'ink'} onClick={() => setTheme('ink')}>
                <Moon size={14} aria-hidden />
                Ink
              </button>
            </div>
            <div className="density-control">
              <label htmlFor="density">表示密度</label>
              <select
                id="density"
                value={density}
                onChange={(e) => setDensity(e.target.value as Density)}
              >
                <option value="comfortable">標準</option>
                <option value="compact">高密度</option>
              </select>
            </div>
            <p className="sidebar-version">v{version}</p>
          </div>
        </aside>
        {navOpen && (
          <button
            className="mobile-scrim"
            aria-label="メニューを閉じる"
            onClick={() => setNavOpen(false)}
          />
        )}
        <div className="app-main">
          <header className="app-topbar">
            <IconButton
              ref={menuRef}
              aria-controls="app-navigation"
              className="mobile-menu"
              size="sm"
              label="メニューを開く"
              icon={<Menu />}
              tooltip={false}
              onClick={() => setNavOpen(true)}
              aria-expanded={navOpen}
            />
            <span className="topbar-title">{active.label}</span>
          </header>
          <main id="main" className="app-content" tabIndex={-1}>
            {page === 'overview' ? (
              <>
                <section className="overview-hero">
                  <div className="hero-copy">
                    <h1>業務の画面を、読みやすく組み立てる。</h1>
                    <p>
                      KEI は、日本語の画面を基準に設計した React のコンポーネントと CSS
                      トークンです。操作の色はウルトラマリン一色。影を使わず、面の明るさと1pxの線で階層をつくります。
                    </p>
                    <div className="button-row">
                      <Button
                        variant="primary"
                        icon={<ArrowRight size={16} />}
                        onClick={() => go('components')}
                      >
                        部品を見る
                      </Button>
                      <Button variant="ghost" onClick={() => go('foundations')}>
                        デザインの基礎
                      </Button>
                    </div>
                    <dl className="hero-facts">
                      <div>
                        <dt>本文</dt>
                        <dd>16px／操作画面は14px</dd>
                      </div>
                      <div>
                        <dt>テーマ</dt>
                        <dd>Paper と Ink</dd>
                      </div>
                      <div>
                        <dt>コントラスト</dt>
                        <dd>すべての組み合わせをテストで検査</dd>
                      </div>
                    </dl>
                  </div>
                  <InstrumentPanel />
                </section>
                <section className="overview-section" aria-labelledby="principles-title">
                  <h2 id="principles-title">4つの約束</h2>
                  <div className="principle-row">
                    {principles.map((p) => (
                      <div key={p.title}>
                        <h3>{p.title}</h3>
                        <p>{p.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="overview-section" aria-labelledby="practice-title">
                  <div className="overview-section-head">
                    <h2 id="practice-title">画面の例：読み物を探す</h2>
                    <button className="section-more" onClick={() => go('patterns')}>
                      ほかの画面例 <ArrowRight size={14} aria-hidden />
                    </button>
                  </div>
                  <div className="overview-stage">
                    <ResourceLibrary />
                  </div>
                </section>
                <section className="overview-section">
                  <ColorFoundation />
                  <button className="section-more" onClick={() => go('foundations')}>
                    文字と余白も見る <ArrowRight size={14} aria-hidden />
                  </button>
                </section>
                <section className="starter-block" aria-labelledby="start-title">
                  <div>
                    <h2 id="start-title">使い始める</h2>
                    <p>
                      アプリのルートを <code>KeiProvider</code>{' '}
                      で包み、スタイルシートを1つ読み込みます。
                    </p>
                  </div>
                  <pre>
                    <code>{`import { KeiProvider, Button } from '@kei-design/react';\nimport '@kei-design/react/styles.css';\n\n<KeiProvider theme="paper">\n  <Button variant="primary">作業を追加</Button>\n</KeiProvider>`}</code>
                  </pre>
                </section>
              </>
            ) : (
              <>
                <div className="page-heading">
                  <h1>{active.label}</h1>
                  <p>{active.lead}</p>
                  {page === 'components' && (
                    <a className="inline-link" href={storybookUrl} target="_blank" rel="noreferrer">
                      Storybook ですべての状態と props を見る <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
                {page === 'foundations' && <Foundations />}
                {page === 'components' && <ComponentGallery />}
                {page === 'patterns' && (
                  <Tabs
                    label="画面例"
                    defaultValue="library"
                    items={[
                      {
                        value: 'library',
                        label: '探す',
                        content: (
                          <div className="pattern-stage">
                            <ResourceLibrary />
                          </div>
                        ),
                      },
                      {
                        value: 'article',
                        label: '読む',
                        content: (
                          <div className="pattern-stage">
                            <ArticleExample />
                          </div>
                        ),
                      },
                      {
                        value: 'registration',
                        label: '申し込む',
                        content: (
                          <div className="pattern-stage">
                            <RegistrationExample />
                          </div>
                        ),
                      },
                      {
                        value: 'operations',
                        label: '管理する',
                        content: (
                          <>
                            <OperationsExample />
                            <section className="settings-pattern" aria-labelledby="settings-title">
                              <h2 id="settings-title">設定の入力と保存</h2>
                              <SettingsExample />
                            </section>
                          </>
                        ),
                      },
                    ]}
                  />
                )}
                {page === 'references' && <ReferenceDirection />}
              </>
            )}
            <footer className="app-footer">
              <span>KEI v{version}</span>
              <span>画面例のデータはサンプルです。再読み込みで元に戻ります。</span>
            </footer>
          </main>
        </div>
      </ToastProvider>
    </KeiProvider>
  );
}
