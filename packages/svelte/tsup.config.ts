import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

const selResolve: Plugin = {
  name: 'externalize-self',
  setup(build) {
    build.onResolve({ filter: /^(@base|@storage)(?:\/|$)/ }, (args) => {
      if (args.path === '@base' || args.path === '@base/index.js') {
        return {
          path: '../index.js',
          external: true,
        };
      }
    });
  },
};

export default defineConfig({
  entry: ['./src/index.ts', './src/storage/index.ts'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: true,
  treeshake: true,
  sourcemap: true,
  platform: 'browser',
  external: ['@anchorlib/core', '@anchorlib/storage', 'svelte', 'vite'],
  esbuildPlugins: [selResolve],
});
