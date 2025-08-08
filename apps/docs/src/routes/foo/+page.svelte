<script lang="ts">
	import { anchor } from '@anchor/svelte';

	const state = anchor({
		count: 0,
		user: {
			viewCount: 0
		}
	});

	// derive(state, console.log);
</script>

<p>Count: {state.count}</p>
<p>User View Count: {state.user.viewCount}</p>
<button onclick={() => (state.count += 1)}>Increment</button>
<button onclick={() => (state.user.viewCount += 1)}>Visit</button>

<hr />

<a href="/">Home</a>
