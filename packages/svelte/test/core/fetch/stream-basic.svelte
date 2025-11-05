<script lang="ts">
  import { streamRef } from '@anchorlib/svelte';

  const initialData = { name: 'test' };
  const options = { url: '/api/stream', method: 'GET' };
  const state = streamRef(initialData, options);
</script>

<span data-testid="data-name">{state.data.name}</span>