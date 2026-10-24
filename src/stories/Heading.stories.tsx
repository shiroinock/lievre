import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading, Button, Card, Text } from '../index';
const meta={title:'Components/Content/Heading',component:Heading,args:{children:'情報を、わかりやすく。',level:2,size:'section'}} satisfies Meta<typeof Heading>;
export default meta;type Story=StoryObj<typeof meta>;
export const Section:Story={};
export const Title:Story={args:{level:1,size:'title'}};
export const Display:Story={args:{level:1,size:'display'}};
