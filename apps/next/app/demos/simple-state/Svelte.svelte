<script lang="ts">
  import { anchorRef } from '@anchorlib/svelte';

  const counter = anchorRef({ count: 0 });
</script>

<div>
  <h1>Counter: {$counter.count}</h1>
  <button onclick={() => $counter.count++}>Increment</button>
  <button onclick={() => $counter.count--}>Decrement</button>
  <button onclick={() => ($counter.count = 0)}>Reset</button>
</div>
