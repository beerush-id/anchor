import { defineConfig } from 'tsup';
import { raw } from 'esbuild-raw-plugin';
import type { Plugin } from 'esbuild';
import * as fs from 'node:fs';

const pathResolve: Plugin = {
  name: 'externalize-self',
  setup(build) {
    build.onResolve({ filter: /^@(actions|utils|components|icons)(?:\/|$)/ }, (args) => {
      const dirs = args.path.split('/').map((dir) => {
        if (dir.startsWith('@')) {
          return `../${dir.replace('@', '')}`;
        }

        return dir;
      });

      return {
        path: dirs.join('/'),
        external: true,
      };
    });
  },
};

const useClientPlugin: Plugin = {
  name: 'use-client',
  setup(build) {
    build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
      const contents = fs.readFileSync(args.path, 'utf8');
      if (contents.startsWith('"use client"') || contents.startsWith("'use client'")) {
        return {
          contents: `'use client';\n${contents}`,
          loader: args.path.endsWith('.tsx') ? 'tsx' : 'jsx',
        };
      }
      return undefined;
    });
  },
};

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/actions/index.ts',
    './src/components/index.tsx',
    './src/icons/index.tsx',
    './src/utils/index.ts',
    './src/styles/index.css',
  ],
  outDir: './dist',
  dts: true,
  minify: false,
  format: ['esm'],
  plugins: [raw()],
  bundle: true,
  splitting: false,
  sourcemap: true,
  platform: 'browser',
  publicDir: './public',
  external: ['@anchorlib/core', '@anchorlib/storage', '@anchorlib/react', 'react'],
  esbuildPlugins: [pathResolve, useClientPlugin],
});
