import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'next/image': fileURLToPath(new URL('./src/next-image.tsx', import.meta.url)),
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
});
