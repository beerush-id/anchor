export type Outsider = {
  destroy: () => void;
};

export function outside(element: HTMLElement, callback: (e: MouseEvent) => void): Outsider {
  const listener = (e: MouseEvent) => {
    if (!element.contains(e.target as Node)) {
      callback(e);
    }
  };

  document.addEventListener('mouseup', listener);

  return {
    destroy: () => {
      document.removeEventListener('mouseup', listener);
    },
  };
}

export type Escaper = {
  destroy: () => void;
};

export function escape(element: HTMLElement, callback: (e: KeyboardEvent) => void): Escaper {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && element.contains(e.target as Node)) {
      callback(e);
    }
  };

  document.addEventListener('keyup', listener);

  return {
    destroy: () => {
      document.removeEventListener('keyup', listener);
    },
  };
}
