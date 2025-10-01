<script lang="ts">
  import { variableRef } from '@anchorlib/svelte';

  const state = variableRef(42);
  let current;
  const unsubscribe = state.subscribe((v) => current = v);
  unsubscribe();
</script>

<span data-testid="state-value">{current}</span>
