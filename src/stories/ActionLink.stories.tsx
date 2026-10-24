import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionLink, Button, Card, Text } from '../index';
const meta={title:'Components/Actions/ActionLink',component:ActionLink,args:{children:'次のページへ',href:'#action-destination'}} satisfies Meta<typeof ActionLink>;
export default meta;type Story=StoryObj<typeof meta>;
export const Primary:Story={};
export const Secondary:Story={args:{variant:'secondary'}};
export const Large:Story={args:{size:'lg'}};
