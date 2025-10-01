<script lang="ts">
  import { modelRef } from '@anchorlib/svelte';
  import { z } from 'zod';

  const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  const initialValue = { name: 'John', age: 30 };
  const state = modelRef(UserSchema, initialValue);
</script>

<span data-testid="state-value">{$state.name}-{$state.age}</span>