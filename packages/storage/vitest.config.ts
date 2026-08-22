import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.{ts,js}'],
    reporters: ['default', 'html'],
    setupFiles: ['./test/setup.ts'],
    outputFile: 'coverage/index.html',
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
