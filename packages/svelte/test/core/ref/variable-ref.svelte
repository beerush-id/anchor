<script lang="ts">
  import { variableRef } from '@anchorlib/svelte';

  const state = variableRef(42);
  const increment = () => state.value += 1;
</script>

<span data-testid="state-value">{$state}</span>
<button data-testid="state-increment" onclick="{increment}">
  Increment
</button>