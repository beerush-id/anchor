export function arrows(element: HTMLElement, cb: (e: KeyboardEvent) => void) {
  const keyup = (e: KeyboardEvent) => {
    if (!element.contains(document.activeElement)) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      cb(e);
    }
  };

  document.addEventListener('keyup', keyup);

  return {
    update: () => undefined,
    destroy: () => {
      document.removeEventListener('keyup', keyup);
    },
  };
}
