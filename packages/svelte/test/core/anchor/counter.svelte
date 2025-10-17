<script lang="ts">
  import { anchorRef } from '@anchorlib/svelte';

  const counter = anchorRef({count: 0});
  const onclick = () => (counter.count++)
</script>

<span data-testid="count">Count: {counter.count}</span>
<button data-testid="increment" {onclick}>Increment</button>
