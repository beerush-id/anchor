<script setup lang="ts">
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';
  import { type TodoRecList, todoTable } from '../../lib/todos.js';
  import Plus from '../icons/Plus.vue';

  const newText = ref('');
  const { todos } = defineProps<{ todos: TodoRecList }>();

  const handleAdd = () => {
    if (newText.value.trim() !== '') {
      const todo = todoTable.add({ text: newText.value, completed: false });
      todos.push(todo.data);
      newText.value = '';
    }
  };

  const formRef = ref(null);
  flashNode(formRef);
</script>

<template>
  <div ref="formRef" class="todo-form mb-6">
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Add a new task..."
        v-model="newText"
        @keyup.enter="handleAdd"
        class="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <button
        @click="handleAdd"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
        <Plus />
      </button>
    </div>
  </div>
</template>
