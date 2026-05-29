import { anchor } from '../engine/index.js';
import { effect, replay, subscribe, untrack } from '../reactive/index.js';
import { exception, model } from '../reactive/ref.js';
import { onCleanup } from '../scope/index.js';
import type {
  ControlledSubscribe,
  ExceptionMap,
  ExceptionType,
  LinkableSchema,
  ModelInput,
  ModelOutput,
  StateChange,
} from '../types.js';

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
 * @param init - Initial values for the form, or function returning initial values
 * @param options - Optional configuration for the form
 * @returns A tuple containing:
 *   - state: Mutable form state that can be updated by user input
 *   - errors: Validation errors for the form fields
 */
export function form<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T | (() => T),
  options?: FormOptions
): [ModelOutput<S>, ExceptionMap<ModelOutput<S>>] {
  const state = model(schema, {} as T, { safeParse: true });

  effect(() => {
    const source = typeof init === 'function' ? init() : init;

    if (anchor.has(source)) {
      untrack(() => Object.assign(state, anchor.get(source)));
      return (subscribe as ControlledSubscribe)(
        source,
        (_, event) => {
          replay(state, event);
        },
        true,
        true
      );
    }

    Object.assign(state, source);
  });

  const { errors, destroy } = exception(state);

  if (options?.safeInit === false) {
    const initParse = schema.safeParse(anchor.get(state));

    if (!initParse.success) {
      for (const issue of initParse.error.issues) {
        const key = issue.path.join('.');

        (errors as ExceptionMap<Record<string, unknown>>)[key as never] = {
          issues: [issue],
          message: issue.message,
        } as ExceptionType;
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
