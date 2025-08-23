<script setup lang="ts">
  import type { ITodoList } from './types.js';
  import { propsRef } from '@anchor/vue';
  import TodoItem from './TodoItem.vue';
  import TodoStats from './TodoStats.vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';

  const props = defineProps<{ todos: ITodoList }>();
  const { todos } = propsRef(props);

  const listRef = ref(null);
  flashNode(listRef);
</script>

<template>
  <ul ref="listRef" class="todo-list bg-gray-50 rounded-lg divide-y divide-gray-200">
    <template v-for="todo in todos" :key="todo.id">
      <TodoItem :todo :todos />
    </template>
    <li v-if="todos.length === 0" class="p-4 text-center text-gray-500">
      No tasks yet. Add a new task to get started!
    </li>
  </ul>
  <TodoStats :todos />
</template>
