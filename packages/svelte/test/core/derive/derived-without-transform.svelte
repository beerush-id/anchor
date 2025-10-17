<script lang="ts">
  import { anchorRef, derivedRef } from '@anchorlib/svelte';

  const source = anchorRef({ count: 42 });
  const derivedValue = derivedRef(source, (c) => c.count);
  source.count = 100;
</script>

<span data-testid="derived-value">{derivedValue.value}</span>