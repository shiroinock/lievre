import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Layout/Card',component:Card,parameters:{docs:{description:{component:'関係のある情報をまとめるsection。タイトルはh2なので、画面側の見出し階層を確認してください。'}}},args:{title:'稼働状況',eyebrow:'SYSTEM / STATUS',children:<p>関連する情報を1つの領域にまとめます。</p>},} satisfies Meta<typeof Card>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Default:Story={};
export const WithAction:Story={args:{action:<Button size="sm">詳細を開く</Button>}};
export const WithoutHeading:Story={args:{title:undefined,eyebrow:undefined}};
