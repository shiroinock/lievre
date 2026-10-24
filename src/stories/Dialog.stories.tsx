import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dialog, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Overlays/Dialog',component:Dialog,parameters:{docs:{description:{component:'フォーカストラップ、Escape、閉じた後のフォーカス復帰に対応。titleとdescriptionは省略せず意味のある説明を付けます。'}}},args:{trigger:<Button>設定を開く</Button>,title:'表示設定',description:'この作業領域の表示を調整します。',children:<TextField label='ワークスペース名' defaultValue='計測ラボ'/>,footer:<><DialogClose asChild><Button>キャンセル</Button></DialogClose><DialogClose asChild><Button variant='primary'>適用</Button></DialogClose></>},} satisfies Meta<typeof Dialog>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Default:Story={};
export const LongContent:Story={args:{children:<div className="k-form-stack">{Array.from({length:8},(_,i)=><TextField key={i} label={`設定項目 ${i+1}`} placeholder="値を入力"/>)}</div>}};
export const OpenClose:Story={play:async({canvasElement})=>{const canvas=within(canvasElement);const trigger=canvas.getByRole('button',{name:'設定を開く'});await userEvent.click(trigger);const body=within(canvasElement.ownerDocument.body);await expect(body.getByRole('dialog',{name:'表示設定'})).toBeVisible();await userEvent.keyboard('{Escape}');await expect(body.queryByRole('dialog')).not.toBeInTheDocument();await expect(trigger).toHaveFocus()}};
