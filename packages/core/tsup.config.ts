import { defineConfig } from 'tsup';
import { raw } from 'esbuild-raw-plugin';

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  plugins: [raw()],
  treeshake: true,
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  publicDir: './public',
});
