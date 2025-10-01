<script lang="ts">
  import { exceptionRef, anchorRef } from '@anchorlib/svelte';

  const state = anchorRef({ count: 42 });
  const exception = exceptionRef(state);
</script>

<span data-testid="exception-errors">{Object.keys($exception.errors).length}</span>