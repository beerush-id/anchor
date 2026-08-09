import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid() as never],
  resolve: {
    conditions: ['development', 'browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    projects: [
      'packages/core',
      'packages/storage',
      'packages/router',
      'packages/react',
      'packages/solid',
      'packages/ssr',
      'packages/svelte',
      'packages/vue',
      'packages/vite-ssr',

      'irpclib/irpc',
      'irpclib/http',
      'irpclib/ws',
      'irpclib/broadcast',
    ],
    exclude: ['packages/react-classic'],
    reporters: ['default', 'html'],
    outputFile: 'docs/.vitepress/dist/coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: [
        'packages/core/src/**/*.ts',
        'packages/storage/src/**/*.ts',
        'packages/router/src/**/*.{ts,tsx}',
        'packages/react/src/**/*.{ts,tsx}',
        'packages/solid/src/**/*.{ts,tsx}',
        'packages/ssr/src/**/*.{ts}',
        'packages/svelte/src/**/*.{ts}',
        'packages/vue/src/**/*.{ts}',
        'packages/vite-ssr/src/pages/**/*.ts',

        'irpclib/irpc/src/**/*.{ts}',
        'irpclib/http/src/**/*.{ts}',
        'irpclib/ws/src/**/*.{ts}',
        'irpclib/broadcast/src/**/*.{ts}',
      ],
      exclude: ['packages/vite-ssr/src/pages/plugin.ts'],
      reportsDirectory: 'docs/.vitepress/dist/coverage/details',
    },
  },
});
