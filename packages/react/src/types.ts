import type { ZodType } from 'zod/v4';
import type { AnchorOptions, StateChange, StateMutation } from '@anchor/core';

export type Derived<T> = [T, StateChange, T];
export type Dependency<T> = keyof T | StateMutation | DependencyMap<T>;
export type Dependencies<T> = Dependency<T>[];
export type DependencyMap<T> = { path?: keyof T; type?: StateMutation };
export type DerivedMemoDeps<T> = Array<Dependency<T> | unknown>;

export type InitFn<T> = () => T;
export type InitOptions<T, S extends ZodType> = AnchorOptions<S> & {
  deps?: Dependencies<T>;
};
