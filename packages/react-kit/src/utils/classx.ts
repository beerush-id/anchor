import type { ClassList, ClassName } from './types.js';
import { isRef } from '@anchorlib/react';

export let BRAND_PREFIX = 'ark';

export interface ClassxFn {
  (...classes: ClassList): string;

  brand(className: string): string;

  getBrand(): string;
  setBrand(name: string): void;

  props<T>(props: T): T;
}

function classFn(...classes: ClassList): string {
  const classNames = classes.filter(Boolean).map((item) => {
    if (Array.isArray(item)) {
      return classFn(...item);
    }

    if (isRef(item)) {
      return classFn(item.value);
    }

    if (typeof item === 'object') {
      return Object.keys(item)
        .filter((key) => item[key])
        .join(' ');
    }

    return item;
  });

  return classNames.join(' ');
}

classFn.brand = (className: string) => {
  if (className.startsWith('--')) {
    return `--${BRAND_PREFIX}-${className.replace(/^--/, '')}`;
  }

  return `${BRAND_PREFIX}-${className}`;
};

classFn.setBrand = (name: string) => {
  BRAND_PREFIX = name;
};

classFn.getBrand = () => BRAND_PREFIX;

classFn.props = <P>(props: { className?: ClassName | ClassList }) => {
  return (props.className ? { ...props, className: classFn(props.className) } : { ...props }) as P;
};

export const classx = classFn as ClassxFn;
