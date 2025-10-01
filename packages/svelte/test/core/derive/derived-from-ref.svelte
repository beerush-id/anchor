<script lang="ts">
  import { anchorRef, derivedRef } from '@anchorlib/svelte';

  const source = anchorRef({ count: 42 });
  const derivedValue = derivedRef(source, (s) => s.count * 2);
</script>

<span data-testid="derived-value">{$derivedValue}</span>