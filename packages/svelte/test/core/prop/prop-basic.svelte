<script lang="ts">
  import { propsRef } from '@anchorlib/svelte';
  import { anchor } from '@anchorlib/core';

  const state = anchor({ count: 42 });
  const props = propsRef({
    count: state,
    name: 'test-name',
  });
</script>

<span data-testid="count">{props.count.value.count}</span>
<span data-testid="name">{props.name}</span>