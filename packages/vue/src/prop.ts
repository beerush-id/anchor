import { anchor, type KeyLike, type State } from '@anchor/core';
import type { Ref } from 'vue';
import { derivedRef } from './derive.js';

export type Props = {
  [key: string]: KeyLike | State;
};

export type PropsRef<T extends Props> = {
  [K in keyof T]: T[K] extends State ? Ref<T[K]> : T[K];
};

export function propsRef<T extends Props>(props: T): PropsRef<T> {
  const ref = {} as Props;

  for (const [key, value] of Object.entries(props)) {
    if (anchor.get(value as State)) {
      ref[key] = derivedRef(value as State) as Ref<T[keyof T]>;
    }
  }

  return ref as PropsRef<T>;
}
