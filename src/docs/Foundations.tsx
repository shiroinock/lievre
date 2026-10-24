import { Badge, Button, Card, Divider, Kbd } from '../index';
export const palette = [
  { name: 'Chalk', token: '--k-bg', hex: '#EFEFF8', use: '作業面' },
  { name: 'Deep blue', token: '--k-text', hex: '#181857', use: '文字・輪郭' },
  { name: 'Ultramarine', token: '--k-accent', hex: '#2424D8', use: '主要操作' },
  { name: 'Blue teal', token: '--k-success', hex: '#165C74', use: '正常・稼働' },
  { name: 'Amber', token: '--k-warning', hex: '#7D570B', use: '要確認' },
  { name: 'Steel', token: '--k-info', hex: '#293FA3', use: '補足情報' },
];
export function ColorFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <span className="k-eyebrow">01 / COLOR</span>
        <h2>白と濃い青で、輪郭を立てる。</h2>
        <p>
          ウルトラマリンは行動、青緑は正常。色は装飾の量を増やすためではなく、判断を速くするために使います。
        </p>
      </div>
      <div className="swatch-grid">
        {palette.map((p) => (
          <div className="swatch" key={p.name}>
            <div style={{ background: `var(${p.token})` }} />
            <strong>{p.name}</strong>
            <span className="k-mono">{p.hex}</span>
            <span>{p.use}</span>
            <code>{p.token}</code>
          </div>
        ))}
      </div>
      <div className="foundation-note">
        HEXはPaperテーマの値。実装では意味に応じたCSS変数を使い、Inkテーマに切り替えても役割を維持します。
      </div>
    </div>
  );
}
export function TypeFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <span className="k-eyebrow">02 / TYPOGRAPHY</span>
        <h2>読む文字と、比較する文字。</h2>
        <p>
          標準の本文は16px、操作画面は14pxを選べます。日本語はシステムのサンセリフ、数値は等幅に。目を引くためだけに本文を小さくしません。
        </p>
      </div>
      <div className="type-specimens">
        <div>
          <span className="k-eyebrow">DISPLAY / 48–64</span>
          <p className="type-display">
            読む。測る。
            <br />
            手を動かす。
          </p>
        </div>
        <div>
          <span className="k-eyebrow">HEADING / 28</span>
          <h2 className="type-heading">情報が、次の行動につながる。</h2>
          <Divider />
          <span className="k-eyebrow">BODY / 16 · INTERFACE / 14 · CAPTION / 12</span>
          <p>
            視線の流れに沿って、必要な情報を必要な場所へ。
            <br />
            状態を読み取り、変化に気づき、迷わず操作できる画面をつくる。
          </p>
          <Divider />
          <span className="k-eyebrow">DATA / TABULAR NUMERALS</span>
          <p className="type-data k-mono">
            0123456789
            <br />
            99.2% <span>/</span> 14:32:08
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
        <span className="k-eyebrow">03 / SPACING & FORM</span>
        <h2>4pxから、秩序を組み立てる。</h2>
        <p>
          4pxの倍数を基本に、内側は8–20px、まとまりの間は24–32px。標準は操作高40px・セル上下12px、高密度は32px・8px。標準の本文16px／操作画面14px、補助12pxは密度と独立して保ちます。
        </p>
      </div>
      <div className="spacing-scale">
        {[4, 8, 12, 16, 24, 32, 48].map((n) => (
          <div key={n}>
            <code>{String(n).padStart(2, '0')}</code>
            <span style={{ width: n * 4 }} />
            <small>{n}px</small>
          </div>
        ))}
      </div>
      <div className="radius-grid">
        {[2, 3, 6].map((r, i) => (
          <div key={r}>
            <span style={{ borderRadius: r }} />
            <div>
              <strong>{r}px</strong>
              <p>{['ラベル・補助記号', '操作部品', 'パネル・ダイアログ'][i]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export function PrincipleFoundation() {
  return (
    <div className="foundation-section">
      <div className="section-intro">
        <span className="k-eyebrow">00 / DESIGN PRINCIPLES</span>
        <h2>道具として、静かに働く。</h2>
        <p>
          81件の参考にある工業的な精密さと印刷物の組版を、読む・探す・申し込む・管理する日々の画面へ。
        </p>
      </div>
      <div className="principle-grid">
        {[
          {
            n: '01',
            title: '読める密度',
            text: '情報量は保ち、罫線と位置を揃えて整理する。小ささを精密さの代わりにしない。',
          },
          {
            n: '02',
            title: '意味のある色',
            text: '青は主要操作、青緑は正常、黄は要確認。状態は文字や記号でも必ず伝える。',
          },
          {
            n: '03',
            title: '面と線の階層',
            text: '単色の面、1pxの境界線、余白で階層を示す。上端の光や下側の影は使わず、操作状態は面色と線で伝える。',
          },
          {
            n: '04',
            title: '比較できる数値',
            text: '桁、単位、目盛り、時刻を揃える。実データと装飾の境目を曖昧にしない。',
          },
        ].map((p) => (
          <Card key={p.n} eyebrow={`PRINCIPLE ${p.n}`} title={p.title}>
            <p className="principle-description">{p.text}</p>
          </Card>
        ))}
      </div>
      <div className="foundation-note">
        キーボードで操作でき、フォーカスを見失わず、動きを減らす設定に従うことを共通の約束にします。
        <Kbd>Tab</Kbd> <Kbd>Enter</Kbd> <Kbd>Esc</Kbd>
      </div>
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
    <div className="foundation-page">
      <div className="section-intro">
        <span className="k-eyebrow">SOURCE STUDY / 81 REFERENCES</span>
        <h2>参考の形より、働き方を拾う。</h2>
        <p>
          元画像をそのまま再現するのではなく、繰り返し現れる特徴をルールと部品に置き換えています。
        </p>
      </div>
      <div className="reference-directions">
        {[
          {
            category: 'UI・計器',
            count: 22,
            from: '円形ゲージ、細い目盛り、数値の大きさ、物理的な操作部。',
            to: 'Metric / Meter / Progress と、明確なボタンの輪郭。',
            code: '01 → INSTRUMENTS',
          },
          {
            category: '図解・配線',
            count: 21,
            from: '接続線と端点、枝分かれ、等角投影、細かな注釈。',
            to: '揃った罫線、パネルの連結感、補助ラベルとグリッド。',
            code: '02 → STRUCTURE',
          },
          {
            category: '文字・印刷',
            count: 24,
            from: '等幅文字、大きな番号、仕様欄、黒と紙の対比。',
            to: '日本語本文と数値の書体分離、識別子の組版、仕様書風の余白。',
            code: '03 → TYPOGRAPHY',
          },
          {
            category: '色・質感',
            count: 14,
            from: '紙色、墨色、橙、くすんだ緑、粒状感、透明な層。',
            to: 'ウルトラマリンを軸とするPaper / Inkの2テーマ。すべての部品を影のない面と境界線で統一。',
            code: '04 → MATERIAL',
          },
        ].map((r) => (
          <Card
            key={r.code}
            title={r.category}
            eyebrow={r.code}
            action={<Badge>{r.count}件</Badge>}
          >
            <div className="reference-translation">
              <div>
                <span className="k-eyebrow">OBSERVED</span>
                <p>{r.from}</p>
              </div>
              <span className="k-muted" aria-hidden>
                ↓
              </span>
              <div>
                <span className="k-eyebrow">TRANSLATED</span>
                <p>{r.to}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="foundation-note">
        特に影響の大きい参考：
        <a href="https://jp.pinterest.com/pin/124904589661738327/" target="_blank" rel="noreferrer">
          計器カード群 ↗
        </a>{' '}
        ·{' '}
        <a href="https://jp.pinterest.com/pin/124904589661738326/" target="_blank" rel="noreferrer">
          紙色のダッシュボード ↗
        </a>{' '}
        ·{' '}
        <a href="https://jp.pinterest.com/pin/124904589661738244/" target="_blank" rel="noreferrer">
          機材風の操作パネル ↗
        </a>{' '}
        ·{' '}
        <a href="https://jp.pinterest.com/pin/124904589661738286/" target="_blank" rel="noreferrer">
          カセットの仕様組版 ↗
        </a>
      </div>
    </div>
  );
}
