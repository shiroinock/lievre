// The wear tuning page (npm run wear:tune). Values change the live column at once; 保存 writes
// wear.config.json through the dev server, which regenerates the baked textures and fonts.
import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from 'react';
import tokens from '../../tokens/tokens.json';
import {
  Badge,
  Button,
  DataTable,
  Heading,
  KeiProvider,
  Meter,
  Metric,
  Text,
  TextField,
  type Theme,
  type Wear,
} from '../index';
import { WEAR_CONFIG } from '../wear/params.mjs';
import {
  normaliseConfig,
  OUTLINE_CAPS,
  PRESET_NAMES,
  PRESETS,
  TEXT_KINDS,
  THIN,
  type WearConfig,
  type WearKind,
} from '../wear/presets.mjs';
import { gauges, GUIDES, type GaugeLevel } from '../wear/gauges.mjs';
import { faceVars } from '../wear/textures.mjs';
import { liveWearStyle } from '../wear/live';
import { FontCheck } from './FontCheck';

const themes: Theme[] = ['paper', 'ink', 'sepia', 'rust'];
const kindNames: Record<WearKind, string> = {
  small: '補足（12–13px）',
  text: '本文（14–16px）',
  heading: '見出し',
  figure: '数値（Metric・Meter）',
  data: '表のセル',
};
const levelTone = { ok: 'success', caution: 'warning', warn: 'danger' } as const;
const levelName = { ok: '目安内', caution: '注意', warn: '超過' };
const pct = (v: number) => (
  <>
    <span className="k-mono">{(v * 100).toFixed(0)}</span>%
  </>
);
const px = (v: number) => (
  <>
    <span className="k-mono">{v.toFixed(2)}</span>px
  </>
);

type Slider = {
  label: string;
  hint: string;
  get: (c: WearConfig) => number;
  set: (c: WearConfig, v: number) => WearConfig;
  min: number;
  max: number;
  step: number;
};
function outlineSlider(
  label: string,
  hint: string,
  key: keyof WearConfig['outline'],
  min: number,
  max: number,
  step: number,
): Slider {
  return {
    label,
    hint,
    get: (c) => c.outline[key],
    set: (c, v) => ({ ...c, outline: { ...c.outline, [key]: v } }),
    min,
    max,
    step,
  };
}
const sliders: Slider[] = [
  outlineSlider('縁の荒れの量', '1/1000 em。縁が線に垂直に動く量', 'rough', 0, 20, 0.5),
  outlineSlider('縁の荒れの細かさ', '1/1000 em。小さいほど細かく荒れる', 'roughScale', 8, 60, 1),
  outlineSlider('太さのむらの量', '1/1000 em。インクがにじむ・痩せる量', 'swell', 0, 12, 0.5),
  outlineSlider(
    '太さのむらの広さ',
    '1/1000 em。にじみと痩せが変わる間隔',
    'swellScale',
    80,
    400,
    10,
  ),
  outlineSlider(
    '輪郭を分ける長さ',
    '1/1000 em。短いほど細かく荒れるが、フォントが重くなる',
    'step',
    6,
    30,
    1,
  ),
  {
    label: 'カスレの密度',
    hint: '1枚の模様を横切る筋の数',
    get: (c) => c.kasure.density,
    set: (c, v) => ({ ...c, kasure: { ...c.kasure, density: v } }),
    min: 1,
    max: 16,
    step: 1,
  },
  {
    label: 'カスレのしきい値',
    hint: '高いほど、かすれる画素が減る',
    get: (c) => c.kasure.threshold,
    set: (c, v) => ({ ...c, kasure: { ...c.kasure, threshold: v } }),
    min: 0.3,
    max: 0.95,
    step: 0.01,
  },
  {
    label: 'カスレの最も薄い点',
    hint: '字に残る不透明度の下限',
    get: (c) => c.kasure.floor,
    set: (c, v) => ({ ...c, kasure: { ...c.kasure, floor: v } }),
    min: 0.5,
    max: 1,
    step: 0.01,
  },
  {
    label: '汚れの濃さ',
    hint: '最も濃い点の、文字色の不透明度',
    get: (c) => c.stain.strength,
    set: (c, v) => ({ ...c, stain: { ...c.stain, strength: v } }),
    min: 0,
    max: 0.2,
    step: 0.005,
  },
];

type Status = { state: string; log?: string; problems?: string[]; error?: string };

export function Tune() {
  const [config, setConfig] = useState<WearConfig>(WEAR_CONFIG);
  const [saved, setSaved] = useState<WearConfig>(WEAR_CONFIG);
  const [theme, setTheme] = useState<Theme>('paper');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [baked, setBaked] = useState(0);
  // Live wear redraws every filtered element; let the sliders stay responsive while it catches up.
  const shown = useDeferredValue(config);
  const g = useMemo(() => gauges(shown, tokens), [shown]);
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  useEffect(() => {
    fetch('/__kei-wear/config')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c: WearConfig) => {
        setConfig(c);
        setSaved(c);
      })
      .catch(() => setStatus({ state: 'offline' }));
    fetch('/__kei-wear/status')
      .then((r) => r.json())
      .then((s: Status) => s.state === 'running' && setStatus(s))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (status.state !== 'running') return;
    const timer = setInterval(async () => {
      const next: Status = await (await fetch('/__kei-wear/status')).json();
      if (next.state === 'running') return;
      setStatus(next);
      setBaked((n) => n + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status.state]);

  async function save() {
    setStatus({ state: 'saving' });
    const response = await fetch('/__kei-wear/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const body = await response.json();
    if (!response.ok) return setStatus({ state: 'rejected', ...body });
    setSaved(body.config);
    setStatus({ state: 'running' });
  }

  const setKind = (kind: WearKind, patch: Partial<WearConfig['kinds'][WearKind]>) =>
    setConfig((c) => ({
      ...c,
      preset: 'custom',
      kinds: { ...c.kinds, [kind]: { ...c.kinds[kind], ...patch } },
    }));

  return (
    <KeiProvider theme={theme} className="tune">
      <aside className="tune-controls" aria-label="質感の値">
        <Heading level={1} size="section">
          質感の調整
        </Heading>
        <Text size="small" tone="muted">
          右の「実行時」の列にすぐ反映します。「保存」で wear.config.json
          に書き、焼き込みの画像とフォントを作り直します。
        </Text>
        <fieldset className="tune-presets">
          <legend className="k-label">プリセット</legend>
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((name) => (
            <Button
              key={name}
              size="sm"
              variant={config.preset === name ? 'primary' : 'secondary'}
              aria-pressed={config.preset === name}
              onClick={() => setConfig(normaliseConfig({ preset: name, ...PRESETS[name] }))}
            >
              {PRESET_NAMES[name]}
            </Button>
          ))}
        </fieldset>
        <TextField
          label="ソルト"
          value={config.salt}
          onChange={(e) => setConfig((c) => ({ ...c, preset: 'custom', salt: e.target.value }))}
        />
        {sliders.map((s) => (
          <label key={s.label} className="tune-slider">
            <span className="k-label">
              {s.label} <output>{s.get(config)}</output>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.get(config)}
              onChange={(e) =>
                setConfig((c) => ({ ...s.set(c, Number(e.target.value)), preset: 'custom' }))
              }
            />
            <small>{s.hint}</small>
          </label>
        ))}
        <table className="tune-kinds">
          <caption className="k-label">文字の種類ごと</caption>
          <thead>
            <tr>
              <th scope="col">種類</th>
              <th scope="col">歪み</th>
              <th scope="col">カスレの深さ</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(TEXT_KINDS) as WearKind[]).map((kind) => (
              <tr key={kind}>
                <th scope="row">{kindNames[kind]}</th>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${kindNames[kind]}を歪ませる`}
                    checked={config.kinds[kind].distort}
                    onChange={(e) => setKind(kind, { distort: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="range"
                    aria-label={`${kindNames[kind]}のカスレの深さ`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.kinds[kind].kasure}
                    onChange={(e) => setKind(kind, { kasure: Number(e.target.value) })}
                  />
                  <output>{config.kinds[kind].kasure}</output>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="tune-slider">
          <span className="k-label">テーマ</span>
          <select
            className="k-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="tune-save">
          <Button
            variant="primary"
            onClick={save}
            disabled={!dirty || status.state === 'offline' || status.state === 'saving'}
          >
            保存して焼き込む
          </Button>
          <Button variant="secondary" onClick={() => setConfig(saved)} disabled={!dirty}>
            保存した値に戻す
          </Button>
          <SaveStatus status={status} />
        </div>
      </aside>

      <main className="tune-main">
        <Gauges g={g} />
        <section aria-labelledby="tune-compare">
          <Heading level={2} size="section" id="tune-compare">
            見比べる
          </Heading>
          <div className="tune-columns">
            <Column title="質感なし" wear="off" theme={theme} />
            <Column title="実行時（調整中の値）" wear="live" theme={theme} config={shown} />
            <PreviewColumn theme={theme} config={shown} />
            <Column title="焼き込み（保存した値）" wear="baked" theme={theme} />
          </div>
          <Text size="small" tone="muted">
            実行時の列は、縁の荒れを SVG
            のフィルタで近似します。画素を動かすので、フォントの太さのむらは表せず、ノイズの形もフォントとは違います。焼き込みと同じ見た目は「焼き込み（調整中の値）」の列で確かめてください。この列は、見本の文字だけを開発サーバーでその場で焼き込みます（2秒ほど）。
          </Text>
        </section>
        <FontCheck reach={edgeReach(saved)} stamp={baked} />
      </main>
    </KeiProvider>
  );
}

function SaveStatus({ status }: { status: Status }) {
  const text: Record<string, string> = {
    idle: '',
    offline: '開発サーバーに接続できません。npm run wear:tune で開いてください。保存はできません。',
    saving: '保存しています…',
    running: '保存しました。フォントを焼き込んでいます（1分ほど）…',
    done: '保存し、画像とフォントを焼き込みました。',
    failed: '保存しました。フォントの焼き込みは失敗しました（Python と fontTools が必要です）。',
    rejected: '保存できませんでした。',
  };
  return (
    <div role="status" className="tune-status">
      <Text size="small">{text[status.state]}</Text>
      {status.problems?.map((p) => (
        <Text size="small" key={p}>
          {p}
        </Text>
      ))}
      {status.state === 'failed' && <pre>{status.log}</pre>}
    </div>
  );
}

function Level({ level }: { level: GaugeLevel }) {
  return (
    <Badge tone={levelTone[level]} dot>
      {levelName[level]}
    </Badge>
  );
}

function Gauges({ g }: { g: ReturnType<typeof gauges> }) {
  return (
    <section aria-labelledby="tune-gauges" className="tune-gauges">
      <Heading level={2} size="section" id="tune-gauges">
        読みやすさの目安 <Level level={g.level} />
      </Heading>
      <Text size="small" tone="muted">
        縁の動きは、焼き込むフォントで縁が動く最大の量です（細い画の太さに対する上限で抑えた後）。細い画に対する割合は、荒れとむらの量の合計を、Regular
        の最も細い画（横画、60/1000 em）で割ったもので、目安は {pct(GUIDES.edge[0])}{' '}
        まで。上限を超えた分は抑えられ、縁が上限に張り付きます。カスレは 5%
        以上薄くなる画素の割合で、目安は {pct(GUIDES.thinned[0])} まで。{GUIDES.smallSize}px
        未満の文字の縁を荒らすと「注意」にします。
      </Text>
      <div className="k-table-wrap">
        <table className="k-table">
          <caption className="k-label">文字の大きさごとの目安</caption>
          <thead>
            <tr>
              <th scope="col">大きさ</th>
              <th scope="col">縁の動き</th>
              <th scope="col">細い画に対して</th>
              <th scope="col">カスレで薄くなる画素</th>
              <th scope="col">最も薄い点</th>
              <th scope="col">判定</th>
            </tr>
          </thead>
          <tbody>
            {g.samples.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td>{px(s.outline.px)}</td>
                <td>{pct(s.outline.ratio)}</td>
                <td>{pct(s.kasure.thinned)}</td>
                <td className="k-mono">{s.kasure.faintest.toFixed(2)}</td>
                <td>
                  <Level level={worse(s.outline.level, s.kasure.level)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="k-table-wrap">
        <table className="k-table">
          <caption className="k-label">
            最も濃い汚れの上で、全ての文字色と、最も薄いカスレの文字が 4.5:1 に届くか
          </caption>
          <thead>
            <tr>
              {Object.keys(g.contrast).map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Object.entries(g.contrast).map(([t, c]) => (
                <td key={t}>
                  <span className="k-mono">{c.min.toFixed(2)}:1</span> <Level level={c.level} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
const worse = (a: GaugeLevel, b: GaugeLevel): GaugeLevel =>
  a === 'warn' || b === 'warn' ? 'warn' : a === 'caution' || b === 'caution' ? 'caution' : 'ok';

/** How far the baked faces move an edge, 1/1000 em (the same caps as scripts/wear/font.py). */
function edgeReach({ outline }: WearConfig) {
  const thin = THIN.mono;
  return Math.min(
    OUTLINE_CAPS.total * thin,
    Math.min(outline.rough, OUTLINE_CAPS.edge * thin) +
      Math.min(outline.swell, OUTLINE_CAPS.swell * thin),
  );
}

type Face = {
  family: string;
  weight: number;
  file: string;
  unicodeRange: string;
  sizeAdjust: string;
};
type Preview = { key: string; state: 'idle' | 'baking' | 'ready' | 'failed'; error?: string };

/**
 * Baked wear with unsaved values: the dev server bakes just the sample's characters (font.py
 * preview), and the column swaps them in for the worn faces. Textures come from the same values.
 */
function PreviewColumn({ theme, config }: { theme: Theme; config: WearConfig }) {
  const [preview, setPreview] = useState<Preview>({ key: '', state: 'idle' });
  const outline = JSON.stringify([config.salt, config.outline]);
  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      setPreview((p) => ({ ...p, state: 'baking' }));
      const text = document.querySelector('.tune-specimen')?.textContent ?? '';
      try {
        const response = await fetch('/__kei-wear/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, text }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? body.problems?.join(' '));
        await Promise.all(
          (body.faces as Face[]).map((f) => {
            const family = `${f.family === 'KEI Worn Mono' ? 'KEI Preview Mono' : 'KEI Preview Sans'} ${body.key}`;
            const face = new FontFace(family, `url(/__kei-wear/preview/${body.key}/${f.file})`, {
              weight: String(f.weight),
              unicodeRange: f.unicodeRange,
              // size-adjust is not in TypeScript's DOM types yet.
              sizeAdjust: f.sizeAdjust,
            } as FontFaceDescriptors);
            document.fonts.add(face);
            return face.load();
          }),
        );
        if (current) setPreview({ key: body.key, state: 'ready' });
      } catch (error) {
        // Show only the last line of a Python traceback.
        const message = String(error).trim().split('\n').pop();
        if (current) setPreview((p) => ({ ...p, state: 'failed', error: message }));
      }
    }, 500);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // config is read only for its salt and outline, which `outline` stands for.
  }, [outline]);
  const style = useMemo(() => {
    const vars: Record<string, string> = {
      ...(liveWearStyle('kwp', config, theme) as Record<string, string>),
      ...faceVars(config),
    };
    if (preview.key) {
      vars['--k-wear-sans'] = `'KEI Preview Sans ${preview.key}', 'IBM Plex Sans JP', sans-serif`;
      vars['--k-wear-mono'] =
        `'KEI Preview Mono ${preview.key}', 'KEI Mono', 'KEI Preview Sans ${preview.key}', 'IBM Plex Sans JP', monospace`;
    }
    return vars as CSSProperties;
  }, [config, theme, preview.key]);
  const note = {
    idle: '',
    baking: '見本の文字を焼き込んでいます…',
    ready: '',
    failed: `その場の焼き込みに失敗しました（Python と fontTools が必要です）。保存した値のフォントで表示しています。${preview.error ?? ''}`,
  }[preview.state];
  return (
    <div className="tune-column">
      <Text size="small" tone="muted">
        焼き込み（調整中の値・見本の文字だけ）{note && ` ― ${note}`}
      </Text>
      <KeiProvider theme={theme} wear="baked" className="tune-specimen" style={style}>
        <Specimen />
      </KeiProvider>
    </div>
  );
}

function Column({
  title,
  wear,
  theme,
  config,
}: {
  title: string;
  wear: Wear;
  theme: Theme;
  config?: WearConfig;
}) {
  return (
    <div className="tune-column">
      <Text size="small" tone="muted">
        {title}
      </Text>
      <KeiProvider theme={theme} wear={wear} wearConfig={config} className="tune-specimen">
        <Specimen />
      </KeiProvider>
    </div>
  );
}

const rows = [
  { id: 'SYN-20481', at: '09:12:04', rate: '98.4', count: '1,204' },
  { id: 'SYN-20482', at: '12:34:56', rate: '87.0', count: '312' },
  { id: 'SYN-20483', at: '18:00:30', rate: '100.0', count: '8,976' },
];

function Specimen() {
  return (
    <>
      <Heading level={3} size="display">
        計測 2048
      </Heading>
      <Heading level={3} size="title">
        同期の記録
      </Heading>
      <Heading level={4} size="section">
        機材の点検
      </Heading>
      <Text>16px 本文：鬱蒼とした棚の奥の機材も、記録は揃っています。Wear 0123456789</Text>
      <div style={{ '--k-body': 'var(--k-text-md)' } as CSSProperties}>
        <Text>14px 本文：同期は 12 分 34 秒で終わりました。Wear 0123456789</Text>
      </div>
      <Text size="small">12px 補足：最終更新 2026-10-24 12:34 ／ 担当 計測班</Text>
      <Text>
        ID <span className="k-mono">SYN-20481</span> ／ <span className="k-mono">12:34:56</span> ／{' '}
        <span className="k-mono">98.4</span>%
      </Text>
      <DataTable
        caption="同期の履歴（数値は KEI Mono = Plex Mono）"
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="k-mono">{r.id}</span> },
          { key: 'at', header: '時刻', render: (r) => <span className="k-mono">{r.at}</span> },
          {
            key: 'rate',
            header: '成功率',
            align: 'right',
            render: (r) => (
              <span>
                <span className="k-mono">{r.rate}</span>%
              </span>
            ),
          },
          {
            key: 'count',
            header: '件数',
            align: 'right',
            render: (r) => <span className="k-mono">{r.count}</span>,
          },
        ]}
      />
      <Metric
        label="同期の成功率"
        value="98.4"
        unit="%"
        change="前週より 1.2 ポイント上昇"
        trend="up"
        values={[91, 93, 92, 95, 94, 97, 98]}
        code="SYN-07"
      />
      <Meter value={62} label="筐体の温度" unit="℃" max={100} />
      <TextField label="ワークスペース名" defaultValue="計測ラボ" />
      <div className="tune-buttons">
        <Button variant="primary">保存する</Button>
        <Button variant="secondary">取り消す</Button>
      </div>
    </>
  );
}
