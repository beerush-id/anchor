import type { ZodObject, ZodType } from 'zod/v4';
import type { KeyLike, Linkable, ObjLike, StateReferences } from './types.js';
import { CONTROLLER_REGISTRY, INIT_REGISTRY, REFERENCE_REGISTRY, STATE_BUSY_LIST } from './registry.js';
import { broadcast, linkable } from './internal.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';

export function createGetter<T, S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const { link, schema, configs, mutator, subscribers, subscriptions } = references;
  const { cloned, strict, deferred, immutable, recursive } = configs;

  if (init instanceof Set || init instanceof Map) {
    return (target: ObjLike, prop: KeyLike) => {
      const value = target[prop] as (...args: unknown[]) => unknown;

      if (mutator?.has(value)) {
        return mutator?.get(value);
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    };
  }

  const getter = (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    let value = Reflect.get(target, prop, receiver) as Linkable;

    if (value === init) {
      captureStack.violation.circular(prop, getter);
      return INIT_REGISTRY.get(init as WeakKey) as T;
    }

    if (INIT_REGISTRY.has(value)) {
      value = INIT_REGISTRY.get(value as WeakKey) as Linkable;
    }

    // If the value is an array method, set method, or map method,
    // try to get the method trap from the mutator map.
    if (mutator?.has(value)) {
      return mutator?.get(value);
    }

    if (recursive && !CONTROLLER_REGISTRY.has(value) && linkable(value)) {
      value = anchor(value, {
        schema: (schema as never as ZodObject)?.shape?.[prop as string],
        cloned,
        strict,
        deferred,
        immutable,
        recursive,
      });
    }

    // Link if the value is a reactive state and there is an active subscription.
    // Separating this process from creation is necessary to make sure
    // reading an existing state is linked properly.
    if (CONTROLLER_REGISTRY.has(value) && subscribers.size && !subscriptions.has(value)) {
      if (!(recursive === 'flat' && Array.isArray(target))) {
        link(prop, value);
      }
    }

    return value;
  };

  return getter;
}

export function createSetter<T, S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Set trap factory called on non-reactive state.`);
  }

  const { id, unlink, schema, configs, subscribers, subscriptions } = references;
  const { strict } = configs;

  const setter = (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    const current = Reflect.get(target, prop, receiver) as Linkable;

    if (current === value) {
      return true;
    }

    if (schema) {
      const subSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

      if (subSchema) {
        const result = subSchema.safeParse(value);

        if (result.success) {
          value = result.data as Linkable;
        } else {
          captureStack.error.validation(
            `Attempted to update property: "${prop as string}" of a state:`,
            result.error,
            strict,
            setter
          );

          return !strict;
        }
      }
    }

    Reflect.set(target, prop, value, receiver);

    if (INIT_REGISTRY.has(current)) {
      const state = INIT_REGISTRY.get(current) as Linkable;

      if (subscriptions.has(state)) {
        unlink(state);
      }
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(
        subscribers,
        target,
        {
          type: 'set',
          prev: current,
          keys: [prop as string],
          value: target[prop],
        },
        id
      );
    }

    return true;
  };

  return setter;
}

export function createRemover<T, S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Delete trap factory called on non-reactive state.`);
  }

  const { id, unlink, schema, configs, subscribers, subscriptions } = references;
  const { strict } = configs;

  const remover = (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    const subSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

    if (subSchema) {
      const result = subSchema.safeParse(undefined);

      if (!result.success) {
        captureStack.error.validation(
          `Attempted to delete property: "${prop as string}" of a state:`,
          result.error,
          strict,
          remover
        );

        return !strict;
      }
    }

    const current = Reflect.get(target, prop, receiver) as Linkable;

    Reflect.deleteProperty(target, prop);

    if (INIT_REGISTRY.has(current)) {
      const state = INIT_REGISTRY.get(current) as Linkable;

      if (subscriptions.has(state)) {
        unlink(state);
      }
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(subscribers, target, { type: 'delete', prev: current, keys: [prop] }, id);
    }

    return true;
  };

  return remover;
}
