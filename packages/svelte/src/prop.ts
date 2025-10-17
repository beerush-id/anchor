import { type KeyLike, type State } from '@anchorlib/core';
import type { ConstantRef } from './types.js';

export type Props = {
  [key: string]: KeyLike | State;
};

export type PropsRef<T extends Props> = {
  [K in keyof T]: T[K] extends State ? ConstantRef<T[K]> : T[K];
};

/**
 * Creates a reactive reference object from the provided props.
 * For each property in the input props:
 * - If the value is a State object, it will be converted to a derived ref using derivedRef
 * - Otherwise, the value will be kept as is
 * @deprecated
 * @template T - The type of props extending Props
 * @param {T} props - The input props object containing KeyLike or State values
 * @returns {PropsRef<T>} A new object with State values converted to Refs
 */
export function propsRef<T extends Props>(props: T): PropsRef<T> {
  return props as never as PropsRef<T>;
}
