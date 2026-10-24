import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Display/Avatar',component:Avatar,parameters:{docs:{description:{component:'名前の最初の2文字を表示。フルネームはaria-labelに保持します。'}}},args:{name:'佐藤'},} satisfies Meta<typeof Avatar>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Default:Story={};
export const Small:Story={args:{size:'sm'}};
export const LatinName:Story={args:{name:'SK'}};
