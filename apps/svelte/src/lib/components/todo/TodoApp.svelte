<script lang="ts">
	import { flashNode } from '../../node.svelte.js';
	import { todoTableRef } from '../../todos.js';
	import { anchorRef } from '@anchor/svelte';
	import TodoForm from './TodoForm.svelte';
	import TodoList from './TodoList.svelte';

	const todos = todoTableRef.list();

	let appRef = anchorRef<HTMLElement | null>(null);
	flashNode(appRef);
</script>

<div
	bind:this={$appRef}
	class="mt-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800"
>
	<div class="mb-10 flex flex-col items-center justify-center">
		<img src="/images/anchor-logo.svg" alt="Anchor Logo" class="mb-4 w-16" />
		<h1 class="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
	</div>
	{#if $todos.status === 'pending'}
		<span>Loading...</span>
	{:else if $todos.status === 'error'}
		<span>Error: {$todos.error}</span>
	{:else}
		<TodoForm todos={$todos.data} />
		<TodoList todos={$todos.data} />
	{/if}
</div>
