<script lang="ts">
  import { persistentRef } from '@anchorlib/svelte/storage';

  const { name, init, options } = $props();
  const state = persistentRef(name, init, options);
</script>

<span data-testid="state-value">{state.key}</span>