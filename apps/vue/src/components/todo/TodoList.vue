<script setup lang="ts">
import type { ITodoList } from './types.js';
import { useDerived } from '@anchor/vue';
import TodoItem from './TodoItem.vue';

const { todos } = defineProps<{ todos: ITodoList }>();
const items = useDerived(todos);
</script>

<template>
  <ul class="todo-list bg-gray-50 rounded-lg divide-y divide-gray-200">
    <li v-for="todo in items" :key="todo.id">
      <TodoItem :todo :todos />
    </li>
    <li v-if="items.length === 0" class="p-4 text-center text-gray-500">
      No tasks yet. Add a new task to get started!
    </li>
  </ul>
</template>
