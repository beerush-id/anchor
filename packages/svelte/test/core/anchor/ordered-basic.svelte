<script lang="ts">
  import { orderedRef } from '@anchorlib/svelte';

  const initialArray = [3, 1, 2];
  const compareFn = (a: number, b: number) => a - b;
  const state = orderedRef(initialArray, compareFn);
</script>

<span data-testid="array-value">{$state.join(",")}</span>