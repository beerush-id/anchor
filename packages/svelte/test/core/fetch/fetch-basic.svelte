<script lang="ts">
  import { fetchRef } from '@anchorlib/svelte';

  const initialData = { name: 'test' };
  const options = { url: '/api/test', method: 'GET' };
  const state = fetchRef(initialData, options);
</script>

<span data-testid="data-name">{state.data.name}</span>