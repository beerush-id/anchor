import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  dts: true,
  minify: false,
  format: ['esm'],
  bundle: false,
  sourcemap: true,
  platform: 'browser',
});
