<script setup lang="ts">
  import { propsRef } from '@anchorlib/vue';
  import TodoItem from './TodoItem.vue';
  import TodoStats from './TodoStats.vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';
  import type { TodoRecList } from '../../lib/todos.js';

  const props = defineProps<{ todos: TodoRecList }>();
  const { todos } = propsRef(props);

  const listRef = ref(null);
  flashNode(listRef);
</script>

<template>
  <ul
    ref="listRef"
    class="todo-list bg-gray-50 dark:bg-slate-700 rounded-lg divide-y divide-gray-200 dark:divide-slate-600">
    <template v-for="todo in todos" :key="todo.id">
      <TodoItem v-if="!todo.deleted_at" :todo :todos />
    </template>
    <li v-if="todos.length === 0" class="p-4 text-center text-gray-500 dark:text-slate-400">
      No tasks yet. Add a new task to get started!
    </li>
  </ul>
  <TodoStats :todos />
</template>
