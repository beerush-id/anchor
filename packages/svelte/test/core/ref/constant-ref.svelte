<script lang="ts">
  import { constantRef } from '@anchorlib/svelte';

  const state = constantRef(42);
  state.value = 43; // No-op.
</script>

<span data-testid="state-value">{state.value}</span>