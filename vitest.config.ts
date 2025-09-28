import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/core/test/**/*.{test,spec}.{ts,js}', 'packages/storage/test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    outputFile: 'apps/next/public/coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['packages/core/src/**/*.ts', 'packages/storage/src/**/*.ts'],
      reportsDirectory: 'apps/next/public/coverage/details',
    },
  },
});
