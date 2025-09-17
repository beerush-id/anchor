import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@base': resolve(__dirname, 'src'),
      '@view': resolve(__dirname, 'src/view'),
    },
  },
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
