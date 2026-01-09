import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit() as PluginOption, devtoolsJson() as PluginOption],
});
