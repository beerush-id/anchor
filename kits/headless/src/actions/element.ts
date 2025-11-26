import { actionRef, type ActionRefObj } from '../utils/index.js';

export type ClassActionRef<E> = ActionRefObj<E> & {
  get className(): string;
};

export function classAction<E extends HTMLElement>(classList: () => string): ClassActionRef<E> {
  let className: string;

  const ref = actionRef<E>(() => {
    className = classList();

    return {
      update(element) {
        className = classList();
        element?.setAttribute('class', className);
      },
    };
  });

  return {
    get current() {
      return ref.current;
    },
    set current(value) {
      ref.current = value;
    },
    get className() {
      return className;
    },
    destroy() {
      ref.destroy();
    },
  };
}

export function heightAction<E extends HTMLElement>(height?: number): ActionRefObj<E> {
  return actionRef<E>(() => {
    return {
      update(element) {
        if (!(element instanceof HTMLElement)) return;

        element.style.setProperty('--ark-content-height', `${height ?? element.scrollHeight}px`);
      },
    };
  });
}
