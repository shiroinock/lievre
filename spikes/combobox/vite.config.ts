import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// react・radix-ui はリポジトリ直下の node_modules から読む（二重にしない）。
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'radix-ui'] },
  server: { fs: { allow: ['../..'] } },
});
