<script lang="ts">
  import { isRef, variableRef } from '@anchorlib/svelte';

  const state = variableRef(42);
  const created = isRef(state);
  const increment = () => state.value += 1;
</script>

<span data-testid="state-value">{state.value}</span>
<span data-testid="state-created">{created}</span>
<button data-testid="state-increment" onclick="{increment}">
  Increment
</button>