<script setup lang="ts">
  import { anchorRef } from '@anchor/vue';
  import { shortId } from '@anchor/core';
  import TodoList from './TodoList.vue';
  import type { ITodoList } from './types.js';
  import TodoForm from './TodoForm.vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';

  const todos = anchorRef<ITodoList>([
    {
      id: shortId(),
      text: 'Learn Vue',
      completed: true,
    },
    {
      id: shortId(),
      text: 'Learn Anchor',
      completed: false,
    },
  ]);

  const appRef = ref(null);
  flashNode(appRef);
</script>

<template>
  <div
    ref="appRef"
    class="w-full max-w-md mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl overflow-hidden p-10 border border-slate-200 dark:border-slate-700">
    <div class="flex flex-col items-center justify-center mb-10">
      <img src="../../assets/anchor-logo.webp" alt="Anchor Logo" class="w-20" />
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Todo App</h1>
    </div>
    <TodoForm :todos />
    <TodoList :todos />
  </div>
</template>