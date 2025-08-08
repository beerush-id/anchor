import type { ZodType } from 'zod/v4';
import type { ArrayMutation, ObjectMutation } from '../packages/core/src/types.js';

export type Rec = {
  [key: string]: unknown;
};
export type Part<T> = Partial<T>;
export type KeyOf<T> = Extract<keyof T, string>;
export type ItemTypeOf<T> = T extends readonly (infer U)[] ? U : never;

export type Subscriber<T> = (state: T, event: StateChange<T>) => void;
export type SubscriberList<T> = Readable<Set<Subscriber<T>>>;
export type Subscribe<T> = (callback: Subscriber<T>, emitNow?: boolean) => Unsubscribe;
export type Unsubscribe = () => void;

export type StateChange<T> = {
  readonly type:
    | 'init'
    | 'subscribe'
    | 'update'
    | 'destroy'
    | ObjectMutation
    | ArrayMutation
    | 'map:set'
    | 'map:delete'
    | 'map:clear'
    | 'set:add'
    | 'set:delete'
    | 'unknown'
    | 'validation';
  readonly prop?: keyof T;
  readonly path?: string;
  readonly paths?: string[];
  readonly value?: unknown;
  readonly params?: unknown[];
  readonly oldValue?: unknown;
  readonly emitter?: unknown;
};
export type Publisher<T> = (event: StateChange<T>) => void;

export type Readable<T> = T & {
  readonly subscribe: (run: Subscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
};
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
};

export type Accessor<T> = (value?: T | ComputeFn<T>) => T;
export type ComputeFn<T> = (current: T) => T;

export type SignalOptions<S extends ZodType> = {
  schema?: S;
  strict?: boolean;
};
export type SignalFn<T, S extends ZodType = ZodType> = (
  init: T,
  options?: SignalOptions<S>
) => [Accessor<T>, Subscribe<T>, Publisher<T>];

export function signal<T, S extends ZodType = ZodType>(
  init: T,
  options?: SignalOptions<S>
): [Accessor<T>, Subscribe<T>, Publisher<T>] {
  const { schema, strict = true } = options ?? {};
  const subscribers: Set<Subscriber<T>> = new Set();

  if (schema) {
    validate(init, schema, strict);
  }

  let value: T = init;

  const accessor = ((newValue?) => {
    if (newValue === undefined) {
      return value;
    }

    if (typeof newValue === 'function') {
      newValue = (newValue as ComputeFn<T>)(value);
    }

    if (schema) {
      validate(newValue as T, schema, strict);
    }

    value = newValue as T;

    publish({ type: 'update', value, emitter: value });

    return value;
  }) as Accessor<T>;

  const subscribe = (handler: Subscriber<T>, emitNow = true) => {
    if (emitNow) {
      const event: StateChange<T> = { type: 'init', value: value, emitter: value };
      handler(value as T, event);
    }

    // Store the subscriber to emit events.
    subscribers.add(handler);

    // Return an unsubscribe function.
    return () => {
      subscribers.delete(handler);
    };
  };

  const publish: Publisher<T> = (event: StateChange<T>) => {
    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(value as T, event);
      }
    }
  };

  return [accessor, subscribe, publish];
}

signal.raw = <T, S extends ZodType = ZodType>(init: T, options?: SignalOptions<S>): [T, Subscribe<T>, Publisher<T>] => {
  const [accessor, subscribe, publish] = signal<T, S>(init, options);
  return [accessor(), subscribe, publish];
};

const validate = <T, Z extends ZodType>(value: T, schema?: Z, strict = true) => {
  if (!schema) return;

  const result = schema.safeParse(value);

  if (!result.success) {
    const error = result.error;

    if (strict) {
      throw new Error(`Validation failed: ${error.issues.map((e) => e.message).join(', ')}`);
    } else {
      console.warn(`Validation warning: ${error.issues.map((e) => e.message).join(', ')}`);
    }
  }
};
