<script lang="ts">
  import '../../../src/index.js';
  import { mutable } from '@airlib/core';

  const initialValue = { count: 42, name: 'test' };
  const state = mutable(initialValue);
</script>

<span data-testid="state-value">{state.count}-{state.name}</span>