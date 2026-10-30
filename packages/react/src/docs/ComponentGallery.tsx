import { useState } from 'react';
import { Plus, Settings2, Search, FolderOpen } from 'lucide-react';
import {
  Heading,
  Text,
  Stack,
  Link,
  RadioGroup,
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  Divider,
  EmptyState,
  Kbd,
  Meter,
  Metric,
  Pagination,
  Progress,
  Select,
  Skeleton,
  Sparkline,
  Switch,
  Tabs,
  Textarea,
  TextField,
  Tooltip,
  useToast,
} from '../index';

export function ComponentGallery() {
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(true);
  const [page, setPage] = useState(2);
  const toast = useToast();
  return (
    <div className="component-gallery">
      <div className="section-intro">
        <h2>部品の一覧</h2>
        <p>
          ここにある部品はすべて操作できます。props・状態の一覧・実装例は Storybook にあります。
        </p>
      </div>
      <div className="gallery-grid">
        <Card title="Heading・Text・Link">
          <Stack gap={4}>
            <Heading level={3}>日々の画面を、同じ言葉で。</Heading>
            <Text>本文・見出し・リンクと、余白を共有するレイアウト。</Text>
            <Link href="#core-choice">RadioGroup へ移動</Link>
          </Stack>
        </Card>
        <Card title="RadioGroup">
          <div id="core-choice">
            <RadioGroup
              label="利用シーン"
              defaultValue="personal"
              options={[
                { value: 'personal', label: '個人で使う' },
                { value: 'team', label: 'チームで使う' },
              ]}
            />
          </div>
        </Card>
        <Card title="Button">
          <div className="gallery-stack">
            <div className="button-row">
              <Button
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => toast({ title: '主要操作を実行しました' })}
              >
                作業を追加
              </Button>
              <Button onClick={() => toast({ title: '変更を保存しました' })}>保存する</Button>
              <Button variant="ghost" onClick={() => toast({ title: '操作を取り消しました' })}>
                取り消す
              </Button>
            </div>
            <div className="button-row">
              <Button loading>保存中</Button>
              <Button disabled>利用できません</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  toast({
                    title: '削除操作のサンプルです',
                    description: '実データは削除されません。',
                  })
                }
              >
                削除
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Badge & Avatar">
          <div className="gallery-stack">
            <div className="button-row">
              <Badge tone="success" dot>
                稼働中
              </Badge>
              <Badge tone="warning" dot>
                要確認
              </Badge>
              <Badge tone="danger" dot>
                停止
              </Badge>
              <Badge tone="info">情報</Badge>
              <Badge>待機中</Badge>
            </div>
            <div className="button-row">
              <Avatar name="佐藤" />
              <Avatar name="田中" />
              <Avatar name="鈴木" size="sm" />
              <span className="k-muted">担当者の識別</span>
            </div>
          </div>
        </Card>
        <Card title="TextField & Select">
          <div className="gallery-stack">
            <TextField
              label="ワークスペース名"
              defaultValue="計測ラボ"
              hint="画面の左上に表示されます。"
            />
            <Select
              label="処理モード"
              defaultValue="standard"
              options={[
                { value: 'standard', label: '標準モード' },
                { value: 'eco', label: '省電力モード' },
                { value: 'manual', label: '手動モード' },
              ]}
            />
          </div>
        </Card>
        <Card title="Validation & Textarea">
          <div className="gallery-stack">
            <TextField
              label="メールアドレス"
              defaultValue="example@"
              error="有効なメールアドレスを入力してください。"
            />
            <Textarea label="メモ" placeholder="作業の補足を入力" />
          </div>
        </Card>
        <Card title="Checkbox & Switch">
          <div className="gallery-stack">
            <Checkbox
              label="更新時に通知する"
              hint="変更のある場合にのみ通知します。"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Checkbox label="一部を選択中" checked="indeterminate" />
            <Divider />
            <Switch
              label="自動同期"
              hint="変更をバックグラウンドで反映"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <span className="k-muted" aria-live="polite">
              自動同期は{enabled ? 'オン' : 'オフ'}です
            </span>
          </div>
        </Card>
        <Card title="Dialog & Toast">
          <div className="gallery-stack">
            <p className="k-muted">操作の区切りを明確にし、結果を短く伝えます。</p>
            <div className="button-row">
              <Dialog
                trigger={<Button>設定を開く</Button>}
                title="表示設定"
                description="この作業領域の表示を調整します。"
                footer={
                  <DialogClose asChild>
                    <Button
                      variant="primary"
                      onClick={() => toast({ title: '表示設定を適用しました' })}
                    >
                      完了
                    </Button>
                  </DialogClose>
                }
              >
                <Switch label="補助ラベルを表示" defaultChecked />
              </Dialog>
              <Button
                variant="ghost"
                onClick={() =>
                  toast({
                    title: '設定を保存しました',
                    description: '変更がワークスペースに反映されました。',
                  })
                }
              >
                通知を表示
              </Button>
            </div>
            <Tooltip content="設定の補足情報。フォーカスでも表示されます。">
              <Button size="sm" aria-label="設定のヒント" icon={<Settings2 size={14} />}>
                ヒント
              </Button>
            </Tooltip>
          </div>
        </Card>
        <Card title="Tabs & Breadcrumb">
          <div className="gallery-stack">
            <Breadcrumb
              items={[{ label: 'ワークスペース', href: '#' }, { label: '作業モニター' }]}
            />
            <Tabs
              label="サンプル表示"
              items={[
                {
                  value: 'all',
                  label: 'すべて',
                  count: 8,
                  content: <p className="k-muted">すべての作業を表示しています。</p>,
                },
                {
                  value: 'running',
                  label: '稼働中',
                  count: 4,
                  content: <p className="k-text-success">稼働中の作業は4件です。</p>,
                },
              ]}
            />
            <Pagination page={page} totalPages={5} onPageChange={setPage} />
          </div>
        </Card>
        <Card title="Alert">
          <div className="gallery-stack">
            <Alert tone="warning" title="2件の確認が必要です">
              接続状態を確認してください。
            </Alert>
            <Alert tone="success" title="同期が完了しました">
              すべてのデータは最新です。
            </Alert>
          </div>
        </Card>
        <Card title="Meter & Progress">
          <div className="gallery-meters">
            <Meter value={68} label="リソース使用率" />
            <div className="gallery-stack">
              <Progress value={42} label="CPU" />
              <Progress value={68} label="メモリ" />
              <Progress value={31} label="ストレージ" />
            </div>
          </div>
        </Card>
        <Card title="Metric & Sparkline">
          <Metric
            label="処理の成功率"
            value="99.2"
            unit="%"
            change="前週比 +0.8%"
            trend="up"
            values={[3, 7, 5, 9, 8, 12, 11, 16, 15, 20]}
          />
        </Card>
        <Card title="Skeleton">
          <div className="gallery-stack">
            <Skeleton width="40%" height={14} />
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton width="70%" height={20} />
            <span className="k-muted">レイアウトを保って、読み込みを待つ。</span>
          </div>
        </Card>
        <Card title="EmptyState">
          <EmptyState
            icon={<FolderOpen size={24} />}
            title="まだ作業がありません"
            description="最初の作業を追加して、モニタリングを始めましょう。"
            action={
              <Button
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => toast({ title: '作業の追加は画面例で試せます' })}
              >
                作業を追加
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  );
}
