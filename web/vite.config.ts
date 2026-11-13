import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: path.join(here, 'tailwind.config.js') }), autoprefixer()],
    },
  },
  build: { outDir: path.resolve(here, '../dist'), emptyOutDir: true },
  server: { port: 5173, fs: { allow: [path.resolve(here, '..')] } },
});
