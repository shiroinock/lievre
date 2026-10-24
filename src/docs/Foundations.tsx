import { Badge, Card, Kbd } from '../index';

type Swatch = { token: string; name: string; paper: string; ink: string; use: string };
export const palette: { group: string; swatches: Swatch[] }[] = [
  {
    group: '面',
    swatches: [
      { token: '--k-bg', name: '作業面', paper: '#F3F4F8', ink: '#0B0D26', use: '画面の地' },
      { token: '--k-surface', name: '面', paper: '#FBFBFD', ink: '#11143A', use: 'カード・表' },
      {
        token: '--k-surface-sunken',
        name: '凹んだ面',
        paper: '#E8EAF2',
        ink: '#070920',
        use: '入力の背景・トラック',
      },
    ],
  },
  {
    group: '文字と線',
    swatches: [
      { token: '--k-text', name: '文字', paper: '#121640', ink: '#ECEEFE', use: '本文・見出し' },
      {
        token: '--k-muted',
        name: '補助文字',
        paper: '#4A5070',
        ink: '#B4B9DC',
        use: '説明・ラベル',
      },
      {
        token: '--k-border-strong',
        name: '操作の輪郭',
        paper: '#7C83A4',
        ink: '#6F77B2',
        use: '入力欄・チェックの枠',
      },
    ],
  },
  {
    group: '操作',
    swatches: [
      {
        token: '--k-accent',
        name: 'ウルトラマリン',
        paper: '#2424D8',
        ink: '#A9B1FF',
        use: '主要操作・選択・リンク',
      },
      {
        token: '--k-selected',
        name: '選択の面',
        paper: '#E7E8FD',
        ink: '#23286C',
        use: '選択行・選択中の項目',
      },
    ],
  },
  {
    group: '状態',
    swatches: [
      { token: '--k-success', name: '正常', paper: '#0B6B58', ink: '#7DD6BF', use: '稼働中・完了' },
      { token: '--k-warning', name: '注意', paper: '#7E5400', ink: '#EEC46A', use: '要確認' },
      { token: '--k-danger', name: '危険', paper: '#B3261E', ink: '#FF9E91', use: 'エラー・削除' },
      { token: '--k-info', name: '情報', paper: '#2A4AA6', ink: '#A0B9FF', use: 'お知らせ' },
    ],
  },
];

export function ColorFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <h2>配色</h2>
        <p>
          色は役割で選びます。ウルトラマリンは「押せる・選んでいる」、緑・黄・赤は状態だけに使い、選択に緑は使いません。状態は色だけでなく、文字や記号でも伝えます。
        </p>
      </div>
      {palette.map(({ group, swatches }) => (
        <section className="swatch-group" key={group} aria-label={group}>
          <h3>{group}</h3>
          <div className="swatch-grid">
            {swatches.map((s) => (
              <div className="swatch" key={s.token}>
                <div className="swatch-chip" style={{ background: `var(${s.token})` }} />
                <strong>{s.name}</strong>
                <span>{s.use}</span>
                <code>{s.token}</code>
                <span className="swatch-values k-mono">
                  {s.paper} / {s.ink}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="foundation-note">
        値は Paper / Ink の順。文字と背景の組み合わせはすべて 4.5:1、操作の輪郭とフォーカスは 3:1
        以上をテストで確認しています。
      </p>
    </div>
  );
}

const typeScale = [
  { token: '--k-text-3xl', size: 36, use: '大きな数値・ページ見出し' },
  { token: '--k-text-2xl', size: 28, use: 'ページ見出し' },
  { token: '--k-text-xl', size: 22, use: 'セクション見出し' },
  { token: '--k-text-lg', size: 18, use: 'リード文' },
  { token: '--k-text-base', size: 16, use: '本文（標準）' },
  { token: '--k-text-md', size: 14, use: '本文（操作画面）・ボタン' },
  { token: '--k-text-xs', size: 12, use: '補助・注記' },
];

export function TypeFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <h2>文字</h2>
        <p>
          本文は16pxで行の高さ28px。操作画面では <code>typography="interface"</code>{' '}
          で14px・24pxにします。行の高さは <code>--k-line-body</code>（約1.7倍）と{' '}
          <code>--k-line-tight</code>
          （約1.45倍）で、どの大きさでも4pxの倍数に丸めます。表示密度を変えても文字の大きさは変えません。書体は
          IBM Plex Sans JP と IBM Plex Mono の2つです。
        </p>
      </div>
      <div className="type-scale">
        {typeScale.map((t) => (
          <div key={t.token}>
            <span className="type-scale-sample" style={{ fontSize: `var(${t.token})` }}>
              日々の作業を、読みやすく
            </span>
            <span className="type-scale-meta">
              <strong className="k-tabular">{t.size}px</strong>
              <span>{t.use}</span>
              <code>{t.token}</code>
            </span>
          </div>
        ))}
      </div>
      <div className="type-pairs">
        <div>
          <h3>言葉</h3>
          <p className="type-figure">処理の成功率</p>
          <p>
            見出し・本文・ラベルは IBM Plex Sans
            JP。ラベルは日本語で書き、英字の大文字や記号で飾りません。
          </p>
        </div>
        <div>
          <h3>データ</h3>
          <p className="type-figure k-mono">
            99.2<small>%</small> 14:05
          </p>
          <p>
            数値・時刻・ID・コードは IBM Plex Mono（<code>.k-mono</code>
            ）。英数字と日本語の幅を 1:2 に揃え、端末と同じように桁が並びます。文中の数値は{' '}
            <code>.k-tabular</code> で桁だけ揃えます。
          </p>
        </div>
      </div>
    </div>
  );
}

export function SpaceFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <h2>余白と形</h2>
        <p>
          余白は4pxの倍数。部品の内側は8〜16px、まとまりの間は24〜32px。操作の高さは標準40px、高密度32pxで、左右の余白はボタンが高さの0.4倍、入力欄が0.3倍です。中身は上下左右の中央に置き、アイコンは隣の文字の1行目の中央に揃えます。
        </p>
      </div>
      <div className="spacing-scale">
        {[1, 2, 3, 4, 6, 8, 12].map((n) => (
          <div key={n}>
            <code>--k-space-{n}</code>
            <span style={{ width: `var(--k-space-${n})` }} />
            <small className="k-tabular">{n * 4}px</small>
          </div>
        ))}
      </div>
      <div className="radius-grid">
        {[
          { token: 'sm', px: 3, use: 'チェックボックス・バッジ' },
          { token: 'md', px: 5, use: 'ボタン・入力欄' },
          { token: 'lg', px: 8, use: 'カード・ダイアログ' },
        ].map((r) => (
          <div key={r.token}>
            <span style={{ borderRadius: `var(--k-radius-${r.token})` }} />
            <div>
              <strong>
                <code>--k-radius-{r.token}</code> <span className="k-tabular">{r.px}px</span>
              </strong>
              <p>{r.use}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const principles = [
  {
    title: '読める大きさを守る',
    text: '情報が多い画面でも本文を小さくしない。密度は余白と行の高さで調整する。',
  },
  {
    title: '色は役割で使う',
    text: '青は操作と選択、緑・黄・赤は状態。飾りのための色は足さない。',
  },
  {
    title: '面と線で階層をつくる',
    text: '影や光沢は使わず、面の明るさと1pxの線で前後関係を示す。',
  },
  {
    title: '数値は比べられるように',
    text: '桁・単位・時刻を揃え、変化は矢印と言葉の両方で伝える。',
  },
];

export function PrincipleFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <h2>設計原則</h2>
        <p>迷ったときに立ち返る4つの約束です。</p>
      </div>
      <div className="principle-grid">
        {principles.map((p) => (
          <Card key={p.title} title={p.title}>
            <p className="principle-description">{p.text}</p>
          </Card>
        ))}
      </div>
      <p className="foundation-note">
        すべての部品はキーボードで操作でき、フォーカスが見え、動きを減らす設定に従います。
        <Kbd>Tab</Kbd> <Kbd>Enter</Kbd> <Kbd>Esc</Kbd>
      </p>
    </div>
  );
}

export function Foundations() {
  return (
    <div className="foundation-page">
      <PrincipleFoundation />
      <ColorFoundation />
      <TypeFoundation />
      <SpaceFoundation />
    </div>
  );
}

export function ReferenceDirection() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <h2>参考から取り入れたこと</h2>
        <p>
          81枚の参考画像は見た目を写すためではなく、繰り返し現れる性質を見つけるために使いました。
        </p>
      </div>
      <div className="reference-directions">
        {[
          {
            category: 'UI・計器',
            count: 22,
            from: '円形ゲージ、細い目盛り、大きな数値、物理的な操作部。',
            to: 'Meter・Metric・Progress と、輪郭のはっきりしたボタン。',
          },
          {
            category: '図解・配線',
            count: 21,
            from: '接続線と端点、枝分かれ、細かな注釈。',
            to: '揃った罫線と、面どうしのつながりを示す1pxの境界線。',
          },
          {
            category: '文字・印刷',
            count: 24,
            from: '仕様欄の組版、大きな番号、紙とインクの対比。',
            to: '本文と数値の役割分担、Paper / Ink の2テーマ。',
          },
          {
            category: '色・質感',
            count: 14,
            from: '印刷の青、紙色、くすんだ緑や橙。',
            to: 'ウルトラマリンを軸にした配色。質感は再現せず、平らな面で統一。',
          },
        ].map((r) => (
          <Card key={r.category} title={r.category} action={<Badge>{r.count}件</Badge>}>
            <dl className="reference-translation">
              <div>
                <dt>見えたもの</dt>
                <dd>{r.from}</dd>
              </div>
              <div>
                <dt>取り入れたこと</dt>
                <dd>{r.to}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
      <p className="foundation-note">
        影響の大きかった参考：
        <a href="https://jp.pinterest.com/pin/124904589661738327/" target="_blank" rel="noreferrer">
          計器カード群
        </a>
        、
        <a href="https://jp.pinterest.com/pin/124904589661738326/" target="_blank" rel="noreferrer">
          紙色のダッシュボード
        </a>
        、
        <a href="https://jp.pinterest.com/pin/124904589661738244/" target="_blank" rel="noreferrer">
          機材風の操作パネル
        </a>
        、
        <a href="https://jp.pinterest.com/pin/124904589661738286/" target="_blank" rel="noreferrer">
          カセットの仕様組版
        </a>
        （外部サイトが開きます）
      </p>
    </div>
  );
}
