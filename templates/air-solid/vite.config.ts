import { airPages } from '@airlib/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid({ ssr: true }), airPages({ framework: 'solid' })],
});