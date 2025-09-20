import { isRef, useAction } from '@anchorlib/react';
import { createObserver, type StateChange } from '@anchorlib/core';
import { type ClassList, classx, type StyleName } from '@utils/index.js';

export function useClassName<E>(...classes: ClassList) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const observer = createObserver((event) => assign(event));
    const assign = (event?: StateChange) => {
      console.log(event);
      const classList = observer.run(() => classx(...classes));
      element.setAttribute('class', classList);
    };

    assign();

    return () => {
      console.log('Class binding destroyed.');
      observer.destroy();
    };
  });
}

export function useStyle<E>(styles: StyleName) {
  return useAction<E>((element) => {
    if (!(element instanceof HTMLElement)) return;

    const observer = createObserver((event) => assign(event));
    const assign = ({ keys, value }: StateChange = {} as StateChange) => {
      const prop = keys?.join('.');

      if (prop) {
        if (value) {
          element.style.setProperty(prop, typeof value === 'number' ? value + 'px' : String(value));
        } else {
          element.style.removeProperty(prop);
        }

        return;
      }

      observer.run(() => {
        const styleList = isRef(styles) ? styles.value : styles;

        for (const [key, value] of Object.entries(styleList)) {
          if (typeof value === 'number') {
            element.style.setProperty(key, value + 'px');
          } else if (typeof value === 'string') {
            element.style.setProperty(key, value);
          }
        }
      });
    };

    assign();

    return () => {
      console.log('Style binding destroyed.');
      observer.destroy();
    };
  });
}
