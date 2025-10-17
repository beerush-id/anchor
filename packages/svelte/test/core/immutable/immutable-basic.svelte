<script lang="ts">
  import { immutableRef } from '@anchorlib/svelte';

  const initialValue = { count: 42, name: 'test' };
  const state = immutableRef(initialValue);
</script>

<span data-testid="state-value">{state.count}-{state.name}</span>