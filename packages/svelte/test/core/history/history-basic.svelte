<script lang="ts">
  import { anchorRef, historyRef } from '@anchorlib/svelte';

  const state = anchorRef({ count: 42 });
  const history = historyRef(state);
</script>

<span data-testid="can-backward">{history.canBackward}</span>
<span data-testid="can-forward">{history.canForward}</span>