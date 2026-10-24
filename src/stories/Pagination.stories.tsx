import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {title:'Components/Navigation/Pagination',component:Pagination,parameters:{docs:{description:{component:'先頭・末尾では移動できないボタンを無効にします。pageとonPageChangeで制御します。'}}},args:{page:2,totalPages:5,onPageChange:fn()},} satisfies Meta<typeof Pagination>;
export default meta;
type Story=StoryObj<typeof meta>;

export const Default:Story={render:args=> <PaginationDemo {...args}/>};
export const FirstPage:Story={args:{page:1}};
export const LastPage:Story={args:{page:5}};
export const SinglePage:Story={args:{page:1,totalPages:1}};
function PaginationDemo(args:React.ComponentProps<typeof Pagination>){const [page,setPage]=useState(args.page);return <Pagination {...args} page={page} onPageChange={setPage}/>}
