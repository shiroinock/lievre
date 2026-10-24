import type { Meta, StoryObj } from '@storybook/react-vite';
import App from '../App';
const meta={title:'Patterns/Application',component:App,parameters:{layout:'fullscreen',docs:{description:{component:'ナビゲーションを含む全体像。左下のPaper / Inkと表示密度、各ページへの移動を試せます。このStoryはアプリ内の配色設定を使います。'}}}} satisfies Meta<typeof App>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Workbench:Story={name:'デザインシステム全体'};
