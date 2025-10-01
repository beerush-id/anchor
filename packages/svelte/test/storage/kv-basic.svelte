<script lang="ts">
  import { kvRef } from '@anchorlib/svelte/storage';

  export let name;
  export let init;

  const state = kvRef(name, init);
</script>

<span data-testid="state-value">{$state.value}</span>