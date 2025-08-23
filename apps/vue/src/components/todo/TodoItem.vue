<script setup lang="ts">
  import type { ITodo, ITodoList } from './types.js';
  import { propsRef } from '@anchor/vue';
  import { ref } from 'vue';
  import { flashNode } from '../../lib/node.js';

  const props = defineProps<{ todos: ITodoList; todo: ITodo }>();
  const { todos } = props;
  const { todo } = propsRef(props);

  const handleRemove = () => {
    todos.splice(todos.indexOf(todo.value), 1);
  };

  const itemRef = ref(null);
  flashNode(itemRef);
</script>

<template>
  <li ref="itemRef" class="todo-item p-4 hover:bg-gray-100 transition duration-150 flex items-center">
    <input type="checkbox" v-model="todo.completed" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500" />
    <span :class="{ 'line-through text-gray-400': todo.completed }" class="flex-1 ml-3 text-gray-700">
      {{ todo.text }}
    </span>
    <button
      @click="handleRemove"
      class="ml-2 text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded transition duration-200">
      X
    </button>
  </li>
</template>
