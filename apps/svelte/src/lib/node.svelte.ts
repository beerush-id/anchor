import type { ConstantRef } from '@anchor/svelte';

export function flashNode(ref?: ConstantRef<HTMLElement | null>) {
	$effect(() => {
		if (!ref?.value) return;

		ref.value.style.boxShadow = '0 0 0 1px rgba(255, 50, 50, 0.75)';
		// e.style.filter = 'drop-shadow(0 0 3px rgba(255, 50, 50, 0.75)';

		setTimeout(() => {
			if (!ref.value) return;

			ref.value.style.boxShadow = '';
			// e.style.filter = '';
		}, 300);
	});
}
