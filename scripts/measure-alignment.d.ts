export type Inset = {
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
  dx: number;
  dy: number;
};
export function inset(el: Element): Inset | null;
export function iconOffset(icon: Element, textEl: Element): { dy: number; size: number } | null;
export const PARTS: string[];
export function measure(selectors?: string[], root?: ParentNode): Record<string, unknown>[];
export function measureIcons(root?: ParentNode): Record<string, unknown>[];
export function audit(root?: ParentNode, tolerance?: number): Record<string, unknown>[];
