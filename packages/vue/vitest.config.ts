import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@base': resolve(__dirname, 'src'),
      '@view': resolve(__dirname, 'src/view'),
    },
  },
  plugins: [vue() as never],
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
