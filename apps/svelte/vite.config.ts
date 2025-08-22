import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { anchor } from '@anchor/svelte/preprocessor';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [anchor(), tailwindcss(), sveltekit(), devtoolsJson()]
});
