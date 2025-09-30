import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

const pathResolve: Plugin = {
  name: 'externalize-self',
  setup(build) {
    build.onResolve({ filter: /^@(base|view)(?:\/|$)/ }, (args) => {
      if (args.path === '@base' || args.path === '@base/index.js') {
        return {
          path: '../index.js',
          external: true,
        };
      }

      if (args.path === '@view' || args.path === '@view/index.js') {
        return {
          path: '../view/index.js',
          external: true,
        };
      }
    });
  },
};

export default defineConfig({
  entry: ['./src/index.ts', './src/storage/index.ts', './src/components/index.tsx', './src/view/index.tsx'],
  outDir: './dist',
  dts: true,
  splitting: false,
  minify: false,
  format: ['esm'],
  bundle: true,
  treeshake: true,
  sourcemap: true,
  platform: 'browser',
  external: ['@anchorlib/core', '@anchorlib/storage', 'react'],
  esbuildPlugins: [pathResolve as never],
});
