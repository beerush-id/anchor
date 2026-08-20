<script lang="ts">
  import '../../../src/index.js';
  import { mutable, onCleanup } from '@airlib/core';

  const counter = mutable({ count: 0 });
  const onclick = () => counter.count++;

  onCleanup(() => {});
</script>

<span data-testid="count">Count: {counter.count}</span>
<button data-testid="increment" on:click={onclick}>Increment</button>
