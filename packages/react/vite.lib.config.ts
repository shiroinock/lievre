import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'lib',
    lib: { entry: 'src/library.ts', formats: ['es'], fileName: 'lievre', cssFileName: 'lievre' },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
});
