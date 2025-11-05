<script lang="ts">
  import { modelRef } from '@anchorlib/svelte';
  import { z } from 'zod';

  const state = modelRef(
    z.object({
      count: z.number(),
    }),
    { count: 42 }
  );

  state.count = '0';
</script>

<span data-testid="exception-errors">{state.count}</span>