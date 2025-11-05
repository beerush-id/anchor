<script lang="ts">
  import Plus from '../icons/Plus.svelte';
  import { type TodoRecList, todoTable } from '../../todos.js';
  import type { KeyboardEventHandler } from 'svelte/elements';

  let newText = $state('');

  const { todos }: { todos: TodoRecList } = $props();

  const handleAdd = () => {
    if (newText.trim() !== '') {
      const todo = todoTable.add({ text: newText, completed: false });
      todos.push(todo.data);
      newText = '';
    }
  };

  const handleEnter: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return;
    handleAdd();
  };
</script>

<div class="todo-form mb-6">
	<div class="flex gap-2">
		<input
			type="text"
			placeholder="Add a new task..."
			bind:value={newText}
			onkeyup={handleEnter}
			class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
		/>
		<button
			onclick={handleAdd}
			class="rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700"
		>
			<Plus />
		</button>
	</div>
</div>
