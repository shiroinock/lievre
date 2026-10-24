import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Inputs/Switch',component:Switch,parameters:{docs:{description:{component:'切り替えるとすぐ適用される二値の設定。保存ボタンが必要な選択にはCheckboxを検討してください。'}}},args:{label:'自動同期',hint:'変更をバックグラウンドで反映します。',onCheckedChange:fn()},} satisfies Meta<typeof Switch>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Off:Story={};
export const On:Story={args:{defaultChecked:true}};
export const Disabled:Story={args:{disabled:true}};
export const Toggle:Story={play:async({canvasElement,args})=>{const toggle=within(canvasElement).getByRole('switch');await userEvent.click(toggle);await expect(toggle).toBeChecked();await expect(args.onCheckedChange).toHaveBeenCalledWith(true)}};
