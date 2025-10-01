<script lang="ts">
  import { rawRef } from '@anchorlib/svelte';

  const initialValue = { count: 42, name: 'test' };
  const state = rawRef(initialValue);
</script>

<span data-testid="state-value">{$state.count}-{$state.name}</span>