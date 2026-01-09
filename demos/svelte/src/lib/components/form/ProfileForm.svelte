<script lang="ts">
  import { z } from 'zod/v4';
  import { form } from '@anchorlib/svelte';
  import type { FormEventHandler } from 'svelte/elements';

  const schema = z.object({
    name: z.string().min(3, 'Name must be 3 characters min.'),
    email: z.email('Email is required and must be a valid format.'),
  });
  const [profile, errors] = form(schema, { name: '', email: '' });

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
  };
</script>

<form
	onsubmit={handleSubmit}
	class="mt-10 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800"
>
	<div class="mb-10 flex flex-col items-center justify-center">
		<img src="/images/anchor-logo.svg" alt="Anchor Logo" class="mb-4 w-16" />
		<h1 class="text-3xl font-medium text-gray-800 dark:text-white">Profile Form</h1>
	</div>
	<div class="form-inputs flex flex-1 flex-col gap-2">
		<label class="flex flex-col gap-1">
			<span class="text-sm text-gray-500">Name</span>
			<input
				bind:value={profile.name}
				placeholder="Enter your name"
				class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
			/>
			{#if errors.name}
				<span class="text-xs text-red-500">{errors.name.message}</span>
			{/if}
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm text-gray-500">Email</span>
			<input
				bind:value={profile.email}
				placeholder="Enter your email"
				class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
			/>
			{#if errors.email}
				<span class="text-xs text-red-500">{errors.email.message}</span>
			{/if}
		</label>
	</div>
	<div class="form-control flex items-center gap-4">
		<button
			type="submit"
			disabled={!profile.name || !profile.email}
			class="w-full rounded-lg bg-blue-500 py-2 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
		>
			Submit
		</button>
	</div>
</form>
