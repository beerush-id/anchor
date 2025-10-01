<script lang="ts">
  import { persistentRef } from '@anchorlib/svelte/storage';

  export let name;
  export let init;
  export let options = undefined;

  const state = persistentRef(name, init, options);
</script>

<span data-testid="state-value">{$state.value.key}</span>