import {
  anchor,
  type Immutable,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type Mutable,
  type MutablePart,
  type MutationKey,
  type StateBaseOptions,
  type StateOptions,
} from '@anchor/core';
import type { VariableRef } from './types.js';
import { variableRef } from './ref.js';

/**
 * Creates an immutable reactive state from the provided initial value using Anchor's immutable functionality.
 * This hook integrates with Vue's reactivity system to provide a type-safe immutable state management solution.
 *
 * @template T - The type of the initial value which must extend Linkable
 * @template S - The schema type for the anchor options, defaults to LinkableSchema
 * @param init - The initial value to create an immutable state from
 * @param options - Optional anchor options to configure the immutable state behavior
 * @returns A Vue Ref containing the immutable state of type Immutable<T>
 */
export function immutableRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<Immutable<T>>;
export function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): VariableRef<ImmutableOutput<T>>;
export function immutableRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S | StateOptions,
  options?: StateOptions<S>
): VariableRef<Immutable<T>> {
  const state = anchor.immutable(init as never, schemaOptions as never, options);
  return variableRef(state) as VariableRef<Immutable<T>>;
}

/**
 * Creates a writable version of a readonly state.
 * This is a Vue wrapper around anchor.writable that returns a Ref.
 *
 * @template T - The type of the readonly state
 * @param state - The readonly state to make writable
 * @returns A Vue Ref containing the writable state
 */
export function writableRef<T extends Linkable>(state: T): VariableRef<Mutable<T>>;
export function writableRef<T extends Linkable, K extends MutationKey<T>[]>(
  state: T,
  contracts: K
): VariableRef<MutablePart<T, K>>;
export function writableRef<T extends Linkable, K extends MutationKey<T>[]>(state: T, contracts?: K): VariableRef<T> {
  const writableState = anchor.writable(state, contracts);
  return variableRef(writableState) as VariableRef<T>;
}
