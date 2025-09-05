import type { Linkable, LinkableSchema, StateOptions } from '@anchor/core';

export type Setter<T extends Linkable> = (prev: T) => T;
export type StateSetter<T extends Linkable, S extends LinkableSchema = LinkableSchema> = (
  value: T | Setter<T>,
  options?: StateOptions<S>
) => void;
export type AnchorState<T extends Linkable, S extends LinkableSchema = LinkableSchema> = [T, StateSetter<T, S>];

export type TransformFn<T extends Linkable, R> = (current: T) => R;
export type TransformSnapshotFn<T, R> = (snapshot: T) => R;
export type Bindable = Record<string, unknown>;
export type AnchoredProps = {
  _state_version: number;
};
