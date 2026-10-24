import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Inputs/Checkbox',component:Checkbox,parameters:{docs:{description:{component:'複数選択やオン・オフの指定。全選択で一部だけ選ばれた状態はindeterminateを使います。'}}},args:{label:'更新時に通知する',hint:'変更があった場合にのみ通知します。',onCheckedChange:fn()},} satisfies Meta<typeof Checkbox>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Unchecked:Story={};
export const Checked:Story={args:{defaultChecked:true}};
export const Indeterminate:Story={args:{checked:'indeterminate'}};
export const Disabled:Story={args:{disabled:true}};
export const Toggle:Story={play:async({canvasElement,args})=>{const checkbox=within(canvasElement).getByRole('checkbox');await userEvent.click(checkbox);await expect(checkbox).toBeChecked();await expect(args.onCheckedChange).toHaveBeenCalledWith(true)}};
