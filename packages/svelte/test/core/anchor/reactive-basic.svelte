<script lang="ts">
  import { reactiveRef } from '@anchorlib/svelte';

  const initialValue = { count: 42, name: 'test' };
  const state = reactiveRef(initialValue);
</script>

<span data-testid="state-value">{$state.count}-{$state.name}</span>