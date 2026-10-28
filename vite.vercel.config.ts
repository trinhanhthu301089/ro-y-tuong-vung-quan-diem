import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Vercel needs the Vinext server plus Nitro output so App Router pages
  // and API handlers are deployed instead of only the landing page shell.
  plugins: [vinext(), nitro()],
  resolve: {
    alias: {
      'next/image': fileURLToPath(new URL('./src/next-image.tsx', import.meta.url)),
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
});
