import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link, Button, Card, Text } from '../index';
const meta={title:'Components/Navigation/Link',component:Link,args:{children:'詳細を読む',href:'#link-destination'}} satisfies Meta<typeof Link>;
export default meta;type Story=StoryObj<typeof meta>;
export const Default:Story={render:args=><div><Link {...args}/><p id='link-destination'>リンクの移動先です。</p></div>};
