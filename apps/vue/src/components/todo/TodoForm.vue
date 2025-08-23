<script setup lang="ts">
  import type { ITodoList } from './types.js';
  import { ref } from 'vue';
  import { shortId } from '@anchor/core';
  import { flashNode } from '../../lib/node.js';

  const newText = ref('');
  const { todos } = defineProps<{ todos: ITodoList }>();

  const handleAdd = () => {
    if (newText.value.trim() !== '') {
      todos.push({
        id: shortId(),
        text: newText.value,
        completed: false,
      });
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
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <button
        @click="handleAdd"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
        Add
      </button>
    </div>
  </div>
</template>
