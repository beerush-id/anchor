import type { AnchorOptions, LinkableSchema, StateChange, StateMutation } from '@anchor/core';

export type Derived<T> = [T, StateChange, T];
export type Dependency<T> = keyof T | StateMutation | DependencyMap<T>;
export type Dependencies<T> = Dependency<T>[];
export type DependencyMap<T> = { path?: keyof T; type?: StateMutation };
export type DerivedMemoDeps<T> = Array<Dependency<T> | unknown>;

export type InitFn<T> = () => T;
export type TransformFn<T, R> = (snapshot: T) => R;
export type InitOptions<T, S extends LinkableSchema> = AnchorOptions<S> & {
  deps?: Dependencies<T>;
};

export type Bindable = Record<string, unknown>;
