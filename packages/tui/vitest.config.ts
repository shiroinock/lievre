import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.tsx'],
    // Ink writes no escape codes at all when the output is not a terminal (CI, a pipe), and the
    // color checks would then pass on empty output. The level under test comes from palette().
    env: { FORCE_COLOR: '3' },
  },
});
