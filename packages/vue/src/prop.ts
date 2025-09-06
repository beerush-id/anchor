import { anchor, type KeyLike, type State } from '@anchor/core';
import type { Ref } from 'vue';
import { derivedRef } from './derive.js';

export type Props = {
  [key: string]: KeyLike | State;
};

export type PropsRef<T extends Props> = {
  [K in keyof T]: T[K] extends State ? Ref<T[K]> : T[K];
};

/**
 * Creates a reactive reference object from the provided props.
 * For each property in the input props:
 * - If the value is a State object, it will be converted to a derived ref using derivedRef
 * - Otherwise, the value will be kept as is
 *
 * @template T - The type of props extending Props
 * @param {T} props - The input props object containing KeyLike or State values
 * @returns {PropsRef<T>} A new object with State values converted to Refs
 */
export function propsRef<T extends Props>(props: T): PropsRef<T> {
  const ref = {} as Props;

  for (const [key, value] of Object.entries(props)) {
    if (anchor.get(value as State)) {
      ref[key] = derivedRef(value as State) as Ref<T[keyof T]>;
    }
  }

  return ref as PropsRef<T>;
}
