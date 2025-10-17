<script lang="ts">
  import { exceptionRef } from '@anchorlib/svelte';
  import { anchor } from '@anchorlib/core';

  const state = anchor({ count: 42 });
  const exception = exceptionRef(state);
</script>

<span data-testid="exception-errors">{Object.keys(exception.errors).length}</span>