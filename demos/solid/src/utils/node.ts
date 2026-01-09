import type { ConstantRef } from '@anchorlib/solid';

export function flashNode(ref: ConstantRef<HTMLElement | null> | undefined) {
  // Effect hook in Solid
  // We'll implement this using Solid's createEffect
  if (!ref) return;

  // We'll need to access the element through ref.value
  // and apply the flash effect
  const element = ref.value;
  if (!element) return;

  element.style.boxShadow = '0 0 0 1px rgba(255, 50, 50, 0.75)';

  setTimeout(() => {
    if (element) {
      element.style.boxShadow = '';
    }
  }, 300);
}
