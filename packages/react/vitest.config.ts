import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.{ts,js,tsx,jsx}'],
    reporters: ['default', 'html'],
    outputFile: 'coverage/index.html',
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reportsDirectory: './coverage/coverage',
    },
  },
});
