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
    '@mdx-js/mdx',
    '@shikijs/rehype',
    '@shikijs/transformers',
    'shiki',
    'unist-util-visit',
    'remark-frontmatter',
    'remark-mdx-frontmatter',
    'rehype-autolink-headings',
    'rehype-slug',
    'remark-directive',
    'remark-gfm',
  ],
});
