<script lang="ts">
  import { observedRef } from '@anchorlib/svelte';
  import { anchor } from '@anchorlib/core';

  const state = anchor({ value: 'test value' });
  const observedValue = observedRef(() => state.value);

  $observedValue = 'updated'; // No-op.

  const updateState = () => {
    state.value = 'updated value';
  };
</script>

<span data-testid="observed-value">{$observedValue}</span>
<button data-testid="update-state" on:click={updateState}>Update</button>