<script lang="ts">
  import { variableRef } from '@anchorlib/svelte';

  const state = variableRef(42);
  const current = $derived(state.value);
</script>

<span data-testid="state-value">{current}</span>
