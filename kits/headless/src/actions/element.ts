import { createAction } from '../utils/index.js';

export function classAction<E>(element: E, classList: () => string) {
  return createAction(() => {
    if (!(element instanceof HTMLElement)) return;

    const update = () => {
      element?.setAttribute('class', classList());
    };

    update();

    return { update };
  });
}
