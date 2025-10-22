import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  dts: true,
  minify: false,
  unbundle: true,
  sourcemap: true,
  treeshake: true,
  platform: 'browser',
  noExternal: ['@beerush/utils'],
});
