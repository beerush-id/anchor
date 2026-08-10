import { airPages } from '@anchorlib/vite-ssr';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid({ ssr: true }), airPages({ framework: 'solid' })],
});