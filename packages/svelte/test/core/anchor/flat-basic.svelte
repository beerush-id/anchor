<script lang="ts">
  import { flatRef } from '@anchorlib/svelte';

  const initialArray = [1, 2, 3];
  const state = flatRef(initialArray);
</script>

<span data-testid="array-length">{state.length}</span>