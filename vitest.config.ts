import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@base': resolve(__dirname, 'packages/react/src'),
      '@view': resolve(__dirname, 'packages/react/src/view'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/core/test/**/*.{test,spec}.{ts,js}',
      'packages/storage/test/**/*.{test,spec}.{ts,js}',
      'packages/react/test/**/*.{test,spec}.{ts,js,tsx,jsx}',
    ],
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
