<script setup lang="ts">
import type { ITodo, ITodoList } from './types.js';
import { useDerived } from '@anchor/vue';

const { todos, todo } = defineProps<{ todos: ITodoList; todo: ITodo }>();
const item = useDerived(todo);

const handleRemove = () => {
  todos.splice(todos.indexOf(todo), 1);
};
</script>

<template>
  <div class="todo-item p-4 hover:bg-gray-100 transition duration-150 flex items-center">
    <input type="checkbox" v-model="item.completed" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
    <span :class="{ 'line-through text-gray-400': item.completed }" class="flex-1 ml-3 text-gray-700">
      {{ item.text }}
    </span>
    <button
      @click="handleRemove"
      class="ml-2 text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded transition duration-200">
      X
    </button>
  </div>
</template>
