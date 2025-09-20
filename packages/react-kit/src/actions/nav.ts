import { useAction } from '@anchorlib/react';

export function useScrollNav<E>() {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const href = element.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const onclick = (event: MouseEvent) => {
      const element = document.querySelector(href);
      if (!element) return;

      event.preventDefault();

      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: offsetTop - 68,
        behavior: 'smooth',
      });
    };

    element.addEventListener('click', onclick);

    return () => {
      element.removeEventListener('click', onclick);
    };
  });
}
