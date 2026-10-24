// Layout gate: renders every story in a real browser and measures where the parts sit.
// jsdom has no layout, so this runs separately from `npm test`.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/test/layout/**/*.layout.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ contextOptions: { reducedMotion: 'reduce' } }),
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1280, height: 900 },
      screenshotFailures: false,
    },
  },
});
