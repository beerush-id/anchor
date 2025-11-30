import { type ActionRef, useAction } from '@anchorlib/react-classic';

export type ClassNameRef<E> = ActionRef<E> & {
  className: string;
};

export function useClassName<E>(action: () => string) {
  const ref = useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const assign = () => {
      element.setAttribute('class', action());
    };

    assign();
  }) as ClassNameRef<E>;

  ref.className = action();

  return ref;
}

export function useHeight<E>(height?: number) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const assign = () => {
      element.style.setProperty('--ark-content-height', `${height ?? element.scrollHeight}px`);
    };

    assign();
  });
}
