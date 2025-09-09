<script lang="ts">
	import { derive } from '@anchor/core';
	import { persistentRef } from '@anchor/svelte/storage';
	import TodoApp from '$lib/components/todo/TodoApp.svelte';

	const settings = persistentRef('settings', {
		theme: 'light'
	});

	if (typeof window !== 'undefined') {
		derive(settings.value, (snapshot) => {
			document.documentElement.classList.toggle('dark', snapshot.theme === 'dark');
		});
	}
</script>

<TodoApp />
<div class="mt-6 flex items-center gap-2">
	<label for="theme-select" class="text-slate-600 dark:text-slate-300">Theme:</label>
	<select
		bind:value={$settings.theme}
		id="theme-select"
		class="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
	>
		<option value="light">Light</option>
		<option value="dark">Dark</option>
	</select>
</div>
