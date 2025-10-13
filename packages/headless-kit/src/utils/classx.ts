import type { ClassList, ClassName } from './types.js';
import { isRef } from './ref.js';

export let BRAND_PREFIX = 'ark';

export function brand(className: string) {
  if (className.startsWith('--')) {
    return `--${BRAND_PREFIX}-${className.replace(/^--/, '')}`;
  }

  return `${BRAND_PREFIX}-${className}`;
}

brand.set = (name: string) => {
  BRAND_PREFIX = name;
};

brand.get = () => BRAND_PREFIX;

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

    if (isRef<string>(item)) {
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

classFn.brand = brand;
classFn.setBrand = brand.set;
classFn.getBrand = brand.get;

classFn.props = <P>(props: { className?: ClassName | ClassList }) => {
  return (props.className ? { ...props, className: classFn(props.className) } : { ...props }) as P;
};

export const classx = classFn as ClassxFn;
