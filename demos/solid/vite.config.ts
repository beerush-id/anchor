import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [tailwindcss() as PluginOption, solid() as PluginOption],
});
