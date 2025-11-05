<script lang="ts">
  import { counter } from '$lib/todos.js';

  const doubled = $derived(counter.count * 2);
</script>

<div>
	<p>You clicked B {counter.count} times {doubled}</p>
	<button onclick={() => counter.count++}>Click 1</button>
</div>
