import {
  anchor,
  type Immutable,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type Mutable,
  type MutablePart,
  type MutationKey,
  type State,
  type StateBaseOptions,
  type StateOptions,
} from '@anchor/core';
import { variableRef } from './ref.js';
import type { ConstantRef, VariableRef } from './types.js';

/**
 * Creates an immutable ref from a state object.
 *
 * @template T The type of the state object.
 * @template S The type of the linkable schema.
 * @param init The initial state object.
 * @param options Optional state options.
 * @returns A VariableRef containing the immutable state.
 */
export function immutableRef<T extends State, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<Immutable<T>>;

/**
 * Creates an immutable ref from a model input and a schema.
 *
 * @template S The type of the linkable schema.
 * @template T The type of the model input.
 * @param init The initial model input.
 * @param schema The linkable schema.
 * @param options Optional base state options.
 * @returns A VariableRef containing the immutable output of the schema.
 */
export function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): VariableRef<ImmutableOutput<S>>;

/** Implementation of `immutableRef` overloads. */
export function immutableRef<T extends State, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S | StateOptions,
  options?: StateOptions<S>
): VariableRef<Immutable<T>> {
  const state = anchor.immutable(init as never, schemaOptions as never, options);
  return variableRef(state) as VariableRef<Immutable<T>>;
}

/**
 * Creates a writable ref from a state object.
 *
 * @template T The type of the state object.
 * @param state The initial state object.
 * @returns A ConstantRef containing the mutable state.
 */
export function writableRef<T extends State>(state: T): ConstantRef<Mutable<T>>;

/**
 * Creates a writable ref from a state object and a list of contracts.
 *
 * @template T The type of the state object.
 * @template K The type of the mutation keys.
 * @param state The initial state object.
 * @param contracts A list of mutation keys.
 * @returns A ConstantRef containing the mutable part of the state.
 */
export function writableRef<T extends State, K extends MutationKey<T>[]>(
  state: T,
  contracts: K
): VariableRef<MutablePart<T, K>>;

/** Implementation of `writableRef` overloads. */
export function writableRef<T extends State, K extends MutationKey<T>[]>(state: T, contracts?: K): ConstantRef<T> {
  const writableState = anchor.writable(state, contracts);
  return variableRef(writableState) as ConstantRef<T>;
}
