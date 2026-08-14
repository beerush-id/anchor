import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  dts: true,
  clean: false,
  target: false,
  minify: false,
  format: ['esm'],
  unbundle: true,
  platform: 'node',
  external: [
    'vfile',
    '@mdx-js/mdx',
    '@mdx-js/rollup',
    'unist-util-visit',
    'remark-frontmatter',
    'remark-mdx-frontmatter',
    'rehype-autolink-headings',
    'rehype-pretty-code',
    'rehype-slug',
    'remark-directive',
    'remark-gfm',
  ],
});
