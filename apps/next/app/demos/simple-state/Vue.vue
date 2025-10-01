<script setup lang="ts">
import { anchorRef } from '@anchorlib/vue';

const counter = anchorRef({ count: 0 });
</script>

<template>
  <div>
    <h1>Counter: {{ counter.count }}</h1>
    <button @click="counter.count++">Increment</button>
    <button @click="counter.count--">Decrement</button>
    <button @click="counter.count = 0">Reset</button>
  </div>
</template>
