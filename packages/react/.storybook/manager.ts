import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Lièvre デザインシステム',
    brandUrl: '/',
    colorPrimary: '#2424d8',
    colorSecondary: '#2424d8',
    appBg: '#f3f4f8',
    appContentBg: '#fbfbfd',
    appBorderColor: '#d5d8e4',
    barBg: '#fbfbfd',
    textColor: '#121640',
    fontBase: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
    fontCode: 'ui-monospace, monospace',
  }),
});
