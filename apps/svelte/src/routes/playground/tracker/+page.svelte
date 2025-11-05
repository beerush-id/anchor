<script lang="ts">
  import '@anchorlib/svelte/reactive';
  import { counter } from '$lib/todos.js';
  import CounterA from './CounterA.svelte';
  import CounterB from './CounterB.svelte';

  const doubled = $derived(counter.count * 2);

  let runeCounter = $state(0);
  let showA = $state(true);
  let showB = $state(true);
</script>

{#if showA}
	<CounterA />
{/if}
{#if showB}
	<CounterB />
{/if}

<div>
	<p>You clicked C {counter.count} times {doubled}</p>
	<button onclick={() => counter.count++}>Click 1</button>
</div>

<div>
	<p>You clicked D {runeCounter} times</p>
	<button onclick={() => runeCounter++}>Click 2</button>
</div>

<div>
	<label>
		<input type="checkbox" bind:checked={showA} />
		<span>Show A</span>
	</label>
	<label>
		<input type="checkbox" bind:checked={showB} />
		<span>Show B</span>
	</label>
</div>
