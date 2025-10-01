<script lang="ts">
  import { immutableRef, writableRef } from '@anchorlib/svelte';

  const immutableState = immutableRef({ count: 42 });
  const writableState = writableRef($immutableState);
</script>

<span data-testid="state-value">{$writableState.count}</span>