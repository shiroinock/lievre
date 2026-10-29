// Written by hand so that the plugin needs no build and no types from ESLint or Oxlint.
type RuleName =
  | 'button-type-in-form'
  | 'metric-unit'
  | 'metric-change'
  | 'dialog-close'
  | 'confirm-dialog-trigger'
  | 'confirm-label'
  | 'danger-tone'
  | 'icon-button-label'
  | 'icon-only-button'
  | 'unit-outside-mono';

type Rule = {
  meta: {
    type: 'problem';
    docs: { description: string; url: string };
    messages: Record<string, string>;
    fixable?: 'code';
    schema: [];
  };
  create: (context: unknown) => Record<string, (node: unknown) => void>;
};

declare const plugin: {
  meta: { name: 'kei'; version: string };
  rules: Record<RuleName, Rule>;
  configs: {
    /** ESLint の flat config に足すと、すべてのルールを error で有効にします。 */
    recommended: {
      name: 'kei/recommended';
      plugins: { kei: typeof plugin };
      rules: Record<`kei/${RuleName}`, 'error'>;
    };
  };
};
export default plugin;
