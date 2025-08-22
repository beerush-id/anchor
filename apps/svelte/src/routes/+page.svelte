<script lang="ts">
	import { useAnchor, useDerived } from '@anchor/svelte';
	import * as z from 'zod/v4';
	import { userState } from '$lib/states.js';

	const schema = z.looseObject({
		count: z.number(),
		user: z.looseObject({
			viewCount: z.number()
		})
	});

	const state = useAnchor(
		{
			count: 0,
			user: {
				viewCount: 0,
				profile: {
					name: 'John Doe',
					age: 30
				}
			}
		},
		{ schema }
	);
	const profile = useDerived(state.user.profile);
	const user = useDerived(userState);

	const failTest = () => {
		console.log(user);
		state.count = '100' as never;
	};

	let count = 0;

	$inspect(state);
</script>

<p>Count: {count}</p>
<p>Count: {state.count}</p>
<p>User View Count: {state.user.viewCount}</p>
<p>User Age: {profile.age}</p>
<p>User Age: {user.age}</p>
<button class="rounded-sm bg-slate-500 px-2 py-1 text-white" onclick={() => (count += 1)}
	>Increment</button
>
<button class="rounded-sm bg-slate-500 px-2 py-1 text-white" onclick={() => (state.count += 1)}
	>Increment</button
>
<button
	class="rounded-sm bg-slate-500 px-2 py-1 text-white"
	onclick={() => (state.user.viewCount += 1)}>Visit</button
>
<button class="rounded-sm bg-slate-500 px-2 py-1 text-white" onclick={() => (profile.age += 1)}
	>Make Older</button
>
<button class="rounded-sm bg-slate-500 px-2 py-1 text-white" onclick={() => (user.age += 1)}
	>Make Older</button
>
<button class="rounded-sm bg-slate-500 px-2 py-1 text-white" onclick={failTest}>Failtest</button>

<hr />

<a href="/foo">Foo</a>
