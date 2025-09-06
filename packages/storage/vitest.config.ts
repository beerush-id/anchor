import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    outputFile: 'coverage/index.html',
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
