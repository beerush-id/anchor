<script lang="ts">
  import { anchorRef, derivedRef } from '@anchorlib/svelte';

  const source = anchorRef({ count: 42 });
  const derivedValue = derivedRef(source, (s) => s.count * 2);

  const increment = () => {
    source.count = 50;
  };
</script>

<span data-testid="derived-value">{derivedValue.value}</span>
<button data-testid="increment" on:click={increment}>Increment</button>