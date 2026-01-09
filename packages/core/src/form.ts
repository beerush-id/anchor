import { onCleanup } from './lifecycle.js';
import { exception, model } from './ref.js';
import { subscribe } from './subscription.js';
import type { ExceptionMap, LinkableSchema, ModelInput, ModelOutput, StateChange } from './types.js';

export type FormOptions = {
  onChange?: (event: StateChange) => void;
  safeInit?: boolean;
};

/**
 * Creates a form with validation based on the provided schema.
 *
 * @template S - The linkable schema type
 * @template T - The model input type based on the schema
 * @param schema - The validation schema to use for the form
 * @param init - Initial values for the form
 * @param options - Optional configuration for the form
 * @returns A tuple containing:
 *   - state: Mutable form state that can be updated by user input
 *   - errors: Validation errors for the form fields
 */
export function form<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: FormOptions
): [ModelOutput<S>, ExceptionMap<ModelOutput<S>>] {
  const state = model(schema, init, { safeParse: true });
  const { errors, destroy } = exception(state);

  if (!options?.safeInit) {
    const initParse = schema.safeParse(init);

    if (!initParse.success) {
      for (const issue of initParse.error.issues) {
        const key = issue.path.join('.');

        errors[key as never] = {
          error: [issue],
          message: issue.message,
        } as never;
      }
    }
  }

  const unsubscribe = subscribe(state, (_c, event) => {
    if (event.type !== 'init') {
      options?.onChange?.(event);
    }
  });

  onCleanup(() => {
    unsubscribe();
    destroy();
  });

  return [state, errors];
}
