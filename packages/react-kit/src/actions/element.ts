import { isRef, useAction } from '@anchorlib/react';
import { type StateChange } from '@anchorlib/core';
import { classx, styleUnit } from '@utils/index.js';
import type { ClassList, StyleRef } from '@base/index.js';

/**
 * A React hook that binds dynamic class names to an element.
 *
 * This hook uses the [useAction] utility to apply CSS classes to a DOM element.
 * It observes changes to the class list and updates the element's [class] attribute accordingly.
 * The hook leverages [classx] utility to compute the final class string from the provided class names.
 *
 * @template E - The type of the DOM element (must extend HTMLElement).
 * @param classes - A list of class names or reactive values that resolve to class names.
 * @returns A function that can be used to bind the class names to an element.
 */
export function useClassName<E>(...classes: ClassList | undefined[]) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const assign = () => {
      const classList = classx(...classes);
      element.setAttribute('class', classList);
    };

    assign();
  });
}

export function useStyle<E>(styles: StyleRef | undefined) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement) || !styles) return;

    const assign = ({ keys, value }: StateChange = {} as StateChange) => {
      const prop = keys?.join('.');

      if (prop) {
        if (typeof value === 'string' || typeof value === 'number') {
          element.style.setProperty(prop, styleUnit(prop, value as string));
        } else {
          element.style.removeProperty(prop);
        }

        return;
      }

      const styleList = isRef(styles) ? styles.value : styles;

      for (const [key, value] of Object.entries(styleList)) {
        element.style.setProperty(key, styleUnit(key, value as string));
      }
    };

    assign();
  });
}
