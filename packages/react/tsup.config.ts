import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

const selResolve: Plugin = {
  name: 'externalize-self',
  setup(build) {
    build.onResolve({ filter: /^@base(?:\/|$)/ }, (args) => {
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
  entry: ['./src/index.ts', './src/components/index.tsx'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: true,
  treeshake: true,
  sourcemap: true,
  platform: 'browser',
  external: ['@anchor/core', '@anchor/storage', 'react'],
  esbuildPlugins: [selResolve],
});
