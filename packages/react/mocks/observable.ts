import { getObserver } from '@anchor/core';

export function mockObserverProp(prop: string, value: unknown) {
  const observer = getObserver();

  if (observer) {
    const originProp = observer[prop];

    Object.defineProperty(observer, prop, {
      value,
      writable: true,
    });

    return () => {
      Object.defineProperty(observer, prop, {
        value: originProp,
        writable: true,
      });
    };
  }

  return () => {};
}
