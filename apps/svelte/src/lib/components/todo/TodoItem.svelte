<script lang="ts">
	import { type TodoRec, todoTable } from '../../todos.js';
	import { anchorRef, derivedRef } from '@anchor/svelte';
	import Trash from '../icons/Trash.svelte';
	import { flashNode } from '../../node.svelte.js';

	const { todo }: { todo: TodoRec } = $props();
	const item = derivedRef(todo, false);

	const handleRemove = (id: string) => {
		todoTable.remove(id);
	};

	let itemRef = anchorRef<HTMLElement | null>(null);
	flashNode(itemRef);
</script>

<li
	bind:this={$itemRef}
	class="todo-item flex items-center p-4 transition duration-150 hover:bg-gray-100 dark:hover:bg-slate-900"
>
	<input
		type="checkbox"
		bind:checked={$item.completed}
		class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
	/>
	<span
		class:line-through={$item.completed}
		class:text-gray-400={$item.completed}
		class="ml-3 flex-1 text-gray-700 dark:text-slate-200"
	>
		{$item.text}
	</span>
	<button
		onclick={() => handleRemove($item.id)}
		class="ml-2 rounded px-2 py-1 text-red-600 opacity-80 transition duration-200 hover:opacity-100 dark:text-slate-300"
	>
		<Trash class="w-6" />
	</button>
</li>
