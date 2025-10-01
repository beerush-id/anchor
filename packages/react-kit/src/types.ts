import type { CSSProperties, FunctionComponent, RefObject } from 'react';
import { type ConstantRef, type ReactiveProps as BaseProps, type VariableRef } from '@anchorlib/react';

export type ClassRef = {
  [key: string]: boolean | undefined;
};
export type ClassName =
  | string
  | ClassRef
  | VariableRef<string | ClassRef | ClassList>
  | ConstantRef<string | ClassRef | ClassList>;
export type ClassList = (ClassName | ClassList | undefined)[];

export type StyleDeclaration = {
  [K in keyof CSSProperties]?: string | number | undefined;
} & {
  [key: `--${string}`]: string | number | undefined;
};
export type StyleRef = StyleDeclaration | VariableRef<StyleDeclaration>;

export type RefProps<E> = {
  ref?: RefObject<E | null>;
};
export type StylingProps = {
  className?: ClassName | ClassList;
  style?: StyleRef;
};

export type ReactiveProps<T> = BaseProps<Omit<T, 'className'>> & StylingProps;

export type ExtendedProps<T> = { [K in keyof T]: T[K] } & {};
export type ExtendedComponent<P, E extends Element> = FunctionComponent<
  ExtendedProps<Omit<P, 'className'> & { className?: ClassName | ClassList } & RefProps<E>>
>;
export type EFC<P, E extends Element> = ExtendedComponent<P, E>;
