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
    projects: ['packages/*'],
    reporters: ['default', 'html'],
    outputFile: 'apps/next/public/coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['packages/core/src/**/*.ts', 'packages/storage/src/**/*.ts', 'packages/react/src/**/*.{ts,tsx}'],
      reportsDirectory: 'apps/next/public/coverage/details',
    },
  },
});
