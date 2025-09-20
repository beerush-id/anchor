import type { FC, HTMLAttributes, RefObject } from 'react';
import type { ConstantRef } from '@anchorlib/react';

export type ClassRefs = {
  [key: string]: boolean | undefined;
};
export type ClassName = string | ClassRefs | ConstantRef<string | ClassRefs>;
export type ClassList = (ClassName | ClassList | undefined)[];

export type RefAttributes<E, A extends HTMLAttributes<E> = HTMLAttributes<E>> = Omit<A, 'className'> & {
  ref?: RefObject<E>;
  className?: ClassName | ClassList;
};
export type ReactiveProps<A> = {
  [K in keyof A]?: ConstantRef<A[K]> | A[K];
};

export type StyleRefs = {
  [K in keyof CSSStyleDeclaration]?: string | number | undefined;
} & {
  [key: `--${string}`]: string | number | undefined;
};
export type StyleName = StyleRefs | ConstantRef<StyleRefs>;

export type RFC<E, A extends HTMLAttributes<E> = HTMLAttributes<E>> = FC<ReactiveProps<RefAttributes<E, A>>>;
