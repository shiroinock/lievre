import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
// jsdom does not implement these layout/pointer APIs. Browser QA checks real positioning.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent;
if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = function () {};
if (!HTMLElement.prototype.hasPointerCapture)
  HTMLElement.prototype.hasPointerCapture = function () {
    return false;
  };
if (!HTMLElement.prototype.setPointerCapture)
  HTMLElement.prototype.setPointerCapture = function () {};
if (!HTMLElement.prototype.releasePointerCapture)
  HTMLElement.prototype.releasePointerCapture = function () {};
// jsdom has no object URLs, and Node's URL.createObjectURL only takes Node's own Blob, not jsdom's.
let objectUrls = 0;
URL.createObjectURL = () => `blob:jsdom/${++objectUrls}`;
URL.revokeObjectURL = () => {};
// No canvas measurement is available in jsdom. Return its unsupported value without a console error.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

if (!window.matchMedia)
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
