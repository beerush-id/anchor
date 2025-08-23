<script setup lang="ts">
  import type { ITodoList } from './types.js';
  import { ref, type Ref } from 'vue';
  import { derivedRef } from '@anchor/vue';
  import { flashNode } from '../../lib/node.js';

  const { todos } = defineProps<{ todos: ITodoList | Ref<ITodoList> }>();
  const stats = derivedRef(todos, (todos) => {
    return {
      total: todos.length,
      active: todos.filter((todo) => !todo.completed).length,
      completed: todos.filter((todo) => todo.completed).length,
    };
  });

  const statsRef = ref(null);
  flashNode(statsRef);
</script>

<template>
  <div
    ref="statsRef"
    class="todo-stats mt-4 flex justify-between items-center bg-white rounded-lg border border-slate-200 p-4">
    <div class="todo-stats-item flex flex-col items-center">
      <span class="todo-stats-label text-sm text-gray-500">Total</span>
      <span class="todo-stats-value text-lg font-semibold">{{ stats.total }}</span>
    </div>
    <div class="todo-stats-item flex flex-col items-center">
      <span class="todo-stats-label text-sm text-gray-500">Active</span>
      <span class="todo-stats-value text-lg font-semibold text-blue-600">{{ stats.active }}</span>
    </div>
    <div class="todo-stats-item flex flex-col items-center">
      <span class="todo-stats-label text-sm text-gray-500">Completed</span>
      <span class="todo-stats-value text-lg font-semibold text-green-600">{{ stats.completed }}</span>
    </div>
  </div>
</template>
