<script setup lang="ts">
  import TodoList from './TodoList.vue';
  import TodoForm from './TodoForm.vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';
  import { todoTableRef } from '../../lib/todos.js';

  const todos = todoTableRef.list();

  const appRef = ref(null);
  flashNode(appRef);
</script>

<template>
  <div
    ref="appRef"
    class="w-full max-w-md mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl overflow-hidden p-10 border border-slate-200 dark:border-slate-700">
    <div class="flex flex-col items-center justify-center mb-10">
      <img src="/images/anchor-logo.svg" alt="Anchor Logo" class="w-16 mb-4" />
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Todo App</h1>
    </div>
    <template v-if="todos.status === 'pending'">
      <span>Loading...</span>
    </template>
    <template v-else-if="todos.status === 'error'">
      <span>Error: {{ todos.error }}</span>
    </template>
    <template v-else>
      <TodoForm :todos="todos.data" />
      <TodoList :todos="todos.data" />
    </template>
  </div>
</template>
