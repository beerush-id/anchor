<script setup lang="ts">
  import TodoApp from './components/todo/TodoApp.vue';
  import { derive } from '@anchorlib/core';
  import { persistentRef } from '@anchorlib/vue/storage';

  const settings = persistentRef('settings', {
    theme: 'light',
  });

  derive(settings.value, (snapshot) => {
    document.documentElement.classList.toggle('dark', snapshot.theme === 'dark');
  });
</script>

<template>
  <TodoApp />
  <div class="mt-6 flex items-center gap-2">
    <label class="text-slate-600 dark:text-slate-300">Theme:</label>
    <select
      v-model="settings.theme"
      class="font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-2 py-1">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>
</template>
