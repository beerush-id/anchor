<script lang="ts">
	import '../app.css';
	import { logger, LogLevel } from '@anchor/core';
	import { userState } from '$lib/states.js';
	import { useDerived } from '@anchor/svelte';

	logger.configure({ level: LogLevel.WARN });

	let { children } = $props();

	const user = useDerived(userState);
	const userAlt = $derived(userState);
</script>

<p>Global age: {user.age}</p>
<p>Global age: {userAlt.age}</p>
{@render children()}
