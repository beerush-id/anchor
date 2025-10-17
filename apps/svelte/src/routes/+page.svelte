<script lang="ts">
	import { subscribe } from '@anchorlib/core';
	import { persistentRef } from '@anchorlib/svelte/storage';
	import TodoApp from '$lib/components/todo/TodoApp.svelte';
	import ProfileForm from '$lib/components/form/ProfileForm.svelte';

	const settings = persistentRef('settings', {
		theme: 'light'
	});

	if (typeof window !== 'undefined') {
		subscribe(settings, (snapshot) => {
			document.documentElement.classList.toggle('dark', snapshot.theme === 'dark');
		});
	}
</script>

<div class="flex w-full flex-col justify-center gap-8 md:flex-row">
	<TodoApp />
	<ProfileForm />
</div>

<div class="mt-6 flex items-center gap-2">
	<label for="theme-select" class="text-slate-600 dark:text-slate-300">Theme:</label>
	<select
		bind:value={settings.theme}
		id="theme-select"
		class="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
	>
		<option value="light">Light</option>
		<option value="dark">Dark</option>
	</select>
</div>
