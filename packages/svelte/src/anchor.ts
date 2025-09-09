import {
  anchor,
  type Immutable,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type StateOptions,
} from '@anchor/core';
import type { ConstantRef, StateRef, VariableRef } from './types.js';
import { linkable, REF_REGISTRY, variableRef } from './ref.js';

/**
 * Creates a writable reference that can be used to manage state with Anchor.
 * This overload is used when no schema is provided, or when using a LinkableSchema with StateOptions.
 *
 * @template T - The type of the initial value
 * @template S - The schema type, extending LinkableSchema
 * @param init - The initial value for the reference
 * @param options - Optional state options for the reference
 * @returns A WritableRef containing the initial value
 */
export function anchorRef<T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T>;

/**
 * Creates a writable reference with a defined schema for validation and type inference.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the reference
 * @param schema - The schema to validate and type the reference
 * @param options - Optional state options for the reference
 * @returns A WritableRef containing the output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions
): VariableRef<ModelOutput<S>>;

/**
 * Creates an immutable writable reference with a defined schema.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the reference
 * @param schema - The schema to validate and type the reference
 * @param options - State options with immutable flag set to true
 * @returns A WritableRef containing an immutable output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions & { immutable: true }
): VariableRef<Immutable<ModelOutput<S>>>;

/**
 * Creates a writable reference for state management with optional schema validation.
 *
 * @template T - The type of the initial value
 * @template S - The schema type or options
 * @param init - The initial value for the reference
 * @param schemaOptions - Either a schema or state options
 * @param options - Additional state options when schema is provided
 * @returns A WritableRef containing the managed state
 */
export function anchorRef<T, S>(
  init: T,
  schemaOptions?: S | StateOptions,
  options?: StateOptions
): T | ModelOutput<S> | Immutable<ModelOutput<S>> {
  const ref = variableRef((linkable(init) ? anchor(init as never, schemaOptions as never, options) : init) as never);
  const stateRef = REF_REGISTRY.get(ref as ConstantRef<unknown>) as StateRef<T>;

  // Create a setter function.
  const set = (value: T) => {
    // Ignore if the value is the same.
    if (value === stateRef.value) return;

    // Destroy the previous value before creating new one if it was a state.
    if (anchor.has(stateRef.value as Linkable)) {
      anchor.destroy(stateRef.value as Linkable);
    }

    // Create a new state using the same options.
    stateRef.value = (linkable(value) ? anchor(value as never, schemaOptions as never, options) : value) as never;
  };

  Object.defineProperties(ref, {
    set: {
      value: set,
    },
    value: {
      get() {
        return stateRef.value;
      },
      set(value: T) {
        set(value);
      },
    },
  });

  return ref as never;
}
