<script setup lang="ts">
  import { propsRef } from '@anchor/vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';
  import { type TodoRec, type TodoRecList, todoTable } from '../../lib/todos.js';
  import Trash from '../icons/Trash.vue';

  const props = defineProps<{ todos: TodoRecList; todo: TodoRec }>();
  const { todo } = propsRef(props);

  const handleRemove = (id: string) => {
    todoTable.remove(id);
  };

  const itemRef = ref(null);
  flashNode(itemRef);
</script>

<template>
  <li
    ref="itemRef"
    class="todo-item p-4 hover:bg-gray-100 dark:hover:bg-slate-900 transition duration-150 flex items-center">
    <input type="checkbox" v-model="todo.completed" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
    <span
      :class="{ 'line-through text-gray-400': todo.completed }"
      class="flex-1 ml-3 text-gray-700 dark:text-slate-200">
      {{ todo.text }}
    </span>
    <button
      @click="handleRemove(todo.id)"
      class="ml-2 text-red-600 dark:text-slate-300 py-1 px-2 rounded transition duration-200 opacity-80 hover:opacity-100">
      <Trash class="w-6" />
    </button>
  </li>
</template>
