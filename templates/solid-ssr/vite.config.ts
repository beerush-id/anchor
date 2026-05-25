import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { airSSR } from '@anchorlib/vite-ssr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    tailwindcss(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/solid/ssr',
    }),
  ],
});
