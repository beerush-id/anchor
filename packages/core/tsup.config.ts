import { defineConfig } from 'tsup';
import { raw } from 'esbuild-raw-plugin';

export default defineConfig({
  entry: ['./src/index.ts', './src/fetch/index.ts', './src/history/index.ts', './src/storage/index.ts'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  plugins: [raw()],
  bundle: true,
  sourcemap: true,
  platform: 'browser',
  publicDir: './public',
});
