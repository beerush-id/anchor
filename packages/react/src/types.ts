import type { BindingKeys, Linkable, ModelError, State, StateUnsubscribe } from '@anchorlib/core';
import type { ReactNode, RefObject } from 'react';

export type StateRef<T> = {
  value: T;
  constant?: boolean;
};
export type VariableRef<T> = {
  get value(): T;
  set value(value: T);
};
export type ConstantRef<T> = {
  get value(): T;
};
export type RefUpdater<T> = (value: T) => void;
export type RefInitializer<T> = (current?: T) => T;

export type AnchorState<T> = [T, VariableRef<T>, RefUpdater<T>];
export type ConstantState<T> = [T, ConstantRef<T>];

export type TransformFn<T extends Linkable, R> = (current: T) => R;
export type TransformSnapshotFn<T, R> = (snapshot: T) => R;
export type Bindable = Record<string, unknown>;
export type AnchoredProps = {
  _state_version: number;
};

export type ExceptionList<T extends State, R extends keyof T> = {
  [key in R]?: Error | ModelError | null;
};
export type Action<T> = (value: T) => StateUnsubscribe | void;
export type ActionRef<T> = RefObject<T> & {
  destroy: () => void;
};
export type FormState<T extends State, K extends keyof T> = {
  data: { [key in K]: T[key] };
  errors: ExceptionList<T, K>;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  reset(): void;
};

export type ReactiveProps<T> = {
  [K in keyof T]: K extends 'children' ? T[K] : VariableRef<T[K]> | ConstantRef<T[K]> | T[K];
};

export type ViewRenderer<P> = (props: P) => ReactNode;
export type ViewRendererFactory<P> = {
  name?: string;
  render: ViewRenderer<P>;
  onMounted?: () => void;
  onUpdated?: () => void;
  onDestroy?: () => void;
};

export type BindingParam<T, B> = B extends VariableRef<T> ? [VariableRef<T>] : [B, BindingKeys<T, B>];
export type BindingProps<P, T, B> = P & {
  bind?: B extends VariableRef<T> ? [VariableRef<T>, never] : [B, BindingKeys<T, B>];
};

export type BindingInit<T, B> = B extends VariableRef<T> ? RefBinding<T> : StateBinding<T, B>;
export type RefBinding<T> = {
  bind?: [VariableRef<T>];
};
export type StateBinding<T, S> = {
  bind?: BindingLink<T, S>;
};
export type BindingLink<T, B> = [B, BindingKeys<T, B>];
