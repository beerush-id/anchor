<script lang="ts">
  import { anchorRef } from '@anchorlib/svelte';

  const initialValue = { count: 42, name: 'test' };
  const state = anchorRef(initialValue);
</script>

<span data-testid="state-value">{state.count}-{state.name}</span>