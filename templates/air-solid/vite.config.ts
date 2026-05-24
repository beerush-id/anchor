import { airSSR } from '@anchorlib/vite-ssr';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    tailwindcss(),
    airSSR({
      router: './src/lib/router.ts',
      layout: './src/pages/layout.tsx',
      renderer: '@anchorlib/solid/ssr',
      irpc: {
        module: { path: './src/lib/module.ts', name: 'irpc' },
        transport: { path: './src/lib/module.ts', name: 'transport' },
        wsTransport: { path: './src/lib/module.ts', name: 'wsTransport' },
        handlers: ['./src/pages/constructor.ts'],
      },
    }),
  ],
});
