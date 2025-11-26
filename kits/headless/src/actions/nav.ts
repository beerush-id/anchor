import { actionRef, type ActionRefObj } from '../utils/index.js';

export enum NavDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export type KeyNavOptions = {
  direction?: NavDirection;
  buttonSelector?: string;
};

export function keyNavRef<T extends HTMLElement>(options?: KeyNavOptions): ActionRefObj<T> {
  const { direction = NavDirection.VERTICAL, buttonSelector = 'button' } = options ?? {};

  const prevKey = direction === NavDirection.VERTICAL ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = direction === NavDirection.VERTICAL ? 'ArrowDown' : 'ArrowRight';

  let current: T | undefined;
  let buttons: NodeListOf<HTMLElement> | undefined;

  return actionRef<T>((element?: T) => {
    current = element;

    const handleKeyDown = (event: KeyboardEvent) => {
      const button = event.currentTarget as HTMLElement;

      if (event.key === prevKey) {
        const prev = button?.previousElementSibling ?? buttons?.[buttons.length - 1];
        if (prev instanceof HTMLElement) {
          prev.focus();
        }
      }

      if (event.key === nextKey) {
        const next = button?.nextElementSibling ?? buttons?.[0];
        if (next instanceof HTMLElement) {
          next.focus();
        }
      }
    };

    return {
      update(element?: T) {
        if (current === element) return;

        buttons?.forEach((btn) => {
          btn.removeEventListener('keydown', handleKeyDown);
        });

        current = element;

        buttons = current?.querySelectorAll(buttonSelector);
        buttons?.forEach((btn) => {
          btn.addEventListener('keydown', handleKeyDown);
        });
      },
      destroy() {
        buttons?.forEach((btn) => {
          btn.removeEventListener('keydown', handleKeyDown);
        });
      },
    };
  });
}
