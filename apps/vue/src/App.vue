<script setup lang="ts">
import TodoApp from './components/todo/TodoApp.vue';
</script>

<template>
  <div class="flex items-center justify-center py-12 gap-6">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <TodoApp />
</template>
