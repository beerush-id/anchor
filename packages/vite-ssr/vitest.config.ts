import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    outputFile: './coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/modules/**/*.ts', 'src/plugins/**/*.ts'],
      exclude: ['src/plugins/main.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
