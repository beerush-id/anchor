import { onUpdated, type Ref } from 'vue';

export function flashNode(ref: Ref<HTMLElement | null>) {
  onUpdated(() => {
    if (!ref.value) return;

    ref.value.style.boxShadow = '0 0 0 1px rgba(255, 50, 50, 0.75)';
    // ref.value.style.filter = 'drop-shadow(0 0 3px rgba(255, 50, 50, 0.75)';

    setTimeout(() => {
      if (!ref.value) return;

      ref.value.style.boxShadow = '';
      // ref.value.style.filter = '';
    }, 300);
  });
}
