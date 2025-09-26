import { useAction } from '@anchorlib/react';

/**
 * A custom hook that enables smooth scrolling navigation for anchor links.
 *
 * This hook attaches click event listeners to anchor elements and handles scrolling
 * to the target element with an optional offset for fixed headers.
 *
 * @template E - The type of the HTML element (should be an anchor element)
 * @param offset - Optional offset value to adjust scroll position for fixed headers
 *
 * @returns A function that accepts an element ref and sets up the scroll navigation
 */
export function useScrollNav<E extends HTMLAnchorElement = HTMLAnchorElement>(offset?: number) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const href = element.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const onclick = (event: MouseEvent) => {
      const targetElement = document.querySelector<HTMLElement>(href);
      if (!targetElement) return;

      event.preventDefault();

      const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: offsetTop - (offset ?? 0),
        behavior: 'smooth',
      });
    };

    element.addEventListener('click', onclick);

    return () => {
      element.removeEventListener('click', onclick);
    };
  });
}
