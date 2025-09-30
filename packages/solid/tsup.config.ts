import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: false,
  treeshake: true,
  sourcemap: true,
  platform: 'browser',
  external: ['@anchorlib/core', '@anchorlib/storage', 'solid-js'],
});
