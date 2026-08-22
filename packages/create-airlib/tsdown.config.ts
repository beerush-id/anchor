import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'bin',
  clean: true,
  dts: false,
  platform: 'node',
});
