import { defineConfig } from 'tsup';
import { raw } from 'esbuild-raw-plugin';

export default defineConfig({
  entry: ['./src/**/*.ts', './src/**/*.tsx'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  plugins: [raw()],
  bundle: false,
  platform: 'browser',
});
