import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/worker.ts'],
  outDir: './dist',
  dts: true,
  clean: true,
  target: false,
  minify: false,
  format: ['esm'],
  unbundle: true,
  platform: 'node',
  define: {
    'process.env.BASE_URL': process.env.BASE_URL ? JSON.stringify(process.env.BASE_URL) : 'undefined',
  },
});
