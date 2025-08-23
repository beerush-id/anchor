import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: true,
  treeshake: true,
  sourcemap: true,
  platform: 'browser',
  external: ['@anchor/core', '@anchor/storage', 'svelte'],
});
