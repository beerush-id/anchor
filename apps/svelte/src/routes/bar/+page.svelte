<script lang="ts" module>
	export type Test = {
		foo: 1;
	};
</script>

<script lang="ts">
	import { userState } from '$lib/states.js';
	import { useAnchor, useDerived } from '@anchor/svelte';
	import { anchor, derive } from '@anchor/core';
	import { SvelteMap } from 'svelte/reactivity';

	let count = $state(0);
	let counter: { count: number } | undefined = $state();

	if (typeof window !== 'undefined') {
		counter = useAnchor({ count: 0 });
	} else {
		counter = useAnchor({ count: 1 });
	}

	const updateCounter = () => {
		counter = useAnchor({ count: 2 });
		console.log((counter.count + 9) * 2);
	};

	const mapState = anchor({
		map: new Map()
	});
	const svMap = new SvelteMap();
	const svUser = $state({ name: 'foo' });
	svMap.set('foo', 1);

	derive.log(mapState);

	$inspect(counter);
	$inspect(svMap, svUser);

	const fooState = useAnchor({ age: 0 });
	const barState = useDerived(userState);
</script>

<p>{count}</p>
<p>{fooState.age}</p>
<p>{barState.age}</p>
<p>Counter: {counter?.count}</p>

<hr />
<button onclick={() => (count += 1)}>Increment</button>
<hr />
<button onclick={() => (fooState.age += 1)}>Increment</button>
<hr />
<button onclick={() => (barState.age += 1)}>Increment</button>
<hr />
<button onclick={() => (counter ? (counter.count += 1) : undefined)}>Increment Counter</button>
<hr />
<button onclick={updateCounter}>Update Counter</button>
