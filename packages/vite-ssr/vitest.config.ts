import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    outputFile: './coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/pages/**/*.ts'],
      exclude: ['src/pages/plugin.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
