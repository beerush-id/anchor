<script lang="ts">
  import { sessionRef } from '@anchorlib/svelte/storage';

  export let name;
  export let init;
  export let options = undefined;

  const state = sessionRef(name, init, options);
</script>

<span data-testid="state-value">{state.key}</span>