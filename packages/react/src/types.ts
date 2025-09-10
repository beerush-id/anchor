import type { Linkable, LinkableSchema, ModelError, State, StateOptions } from '@anchor/core';

export type StateRef<T> = {
  value: T;
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

export type Setter<T extends Linkable> = (prev: T) => T;
export type StateSetter<T extends Linkable, S extends LinkableSchema = LinkableSchema> = (
  value: T | Setter<T>,
  options?: StateOptions<S>
) => void;
export type AnchorState<T extends Linkable> = [T, VariableRef<T>, RefUpdater<T>];

export type TransformFn<T extends Linkable, R> = (current: T) => R;
export type TransformSnapshotFn<T, R> = (snapshot: T) => R;
export type Bindable = Record<string, unknown>;
export type AnchoredProps = {
  _state_version: number;
};

export type ExceptionList<T extends State, R extends keyof T> = {
  [key in R]?: Error | ModelError | null;
};
