import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wearTuneServer } from './scripts/wear/tune-server.mjs';
export default defineConfig({
  // wearTuneServer only runs under `vite` serve: it lets tune.html save wear.config.json.
  plugins: [react(), wearTuneServer()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173, strictPort: true },
});
