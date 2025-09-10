<script lang="ts">
	import { anchorRef, observedRef } from '@anchor/svelte';
	import type { TodoRec } from '../../todos.js';
	import { flashNode } from '../../node.svelte.js';

	const { todos }: { todos: TodoRec[] } = $props();
	const stats = observedRef(() => {
		const available = todos.filter((todo) => !todo.deleted_at);

		return {
			total: available.length,
			active: available.filter((todo) => !todo.completed).length,
			completed: available.filter((todo) => todo.completed).length
		};
	});

	let statsRef = anchorRef<HTMLElement | null>(null);
	flashNode(statsRef);
</script>

<div
	bind:this={$statsRef}
	class="todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
>
	<div class="todo-stats-item flex flex-col items-center">
		<span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
		<span class="todo-stats-value text-lg font-semibold dark:text-white">{$stats.total}</span>
	</div>
	<div class="todo-stats-item flex flex-col items-center">
		<span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Active</span>
		<span class="todo-stats-value text-lg font-semibold text-blue-600 dark:text-blue-400"
			>{$stats.active}</span
		>
	</div>
	<div class="todo-stats-item flex flex-col items-center">
		<span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
		<span class="todo-stats-value text-lg font-semibold text-green-600 dark:text-green-400">
			{$stats.completed}
		</span>
	</div>
</div>
