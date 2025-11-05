<script lang="ts">
  import TodoStats from './TodoStats.svelte';
  import TodoItem from '$lib/components/todo/TodoItem.svelte';
  import type { TodoRecList } from '../../todos.js';

  const { todos }: { todos: TodoRecList } = $props();
  const items = $derived(todos.filter((todo) => !todo.deleted_at));
</script>

<ul
	class="todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700"
>
	{#each items as todo (todo.id)}
		<TodoItem {todo} />
	{:else}
		<li class="p-4 text-center text-gray-500 dark:text-slate-400">
			No tasks yet. Add a new task to get started!
		</li>
	{/each}
</ul>

<TodoStats {todos} />
