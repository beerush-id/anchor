<script setup lang="ts">
import { useAnchor } from '@anchor/vue';
import { shortId } from '@anchor/core';
import TodoList from './TodoList.vue';
import type { ITodoList } from './types.js';
import TodoForm from './TodoForm.vue';

const todos = useAnchor<ITodoList>([
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
</script>

<template>
  <div class="w-full max-w-md mx-auto mt-10 bg-white rounded-xl overflow-hidden p-6 border border-slate-200">
    <div class="flex items-center justify-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Todo App</h1>
    </div>
    <TodoForm :todos />
    <TodoList :todos />
  </div>
</template>
