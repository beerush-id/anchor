import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [
    {
      name: 'mock-ws',
      configureServer(server) {
        if (!server.ws) {
          server.ws = { on: () => {}, send: () => {}, close: () => {} } as any;
        } else if (!server.ws.on) {
          server.ws.on = () => {};
        }
      }
    },
    svelte({ hot: false }) as never, 
    svelteTesting() as never
  ],
  resolve: {
    alias: {
      '@base': resolve(__dirname, 'src'),
      '@anchorlib/svelte': resolve(__dirname, 'src'),
      '@anchorlib/svelte/storage': resolve(__dirname, 'src/storage'),
    },
    conditions: ['browser'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    outputFile: 'coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
