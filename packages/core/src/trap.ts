import type { ZodObject, ZodType } from 'zod/v4';
import type { KeyLike, Linkable, ObjLike, StateReferences } from './types.js';
import { INIT_REGISTRY, REFERENCE_REGISTRY, STATE_BUSY_LIST, STATE_REGISTRY } from './registry.js';
import { broadcast, linkable } from './internal.js';
import { logger } from './logger.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';

export function createGetter<T, S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Get trap factory called on non-reactive state.`);
  }

  const { link, schema, configs, mutator, children, subscribers, subscriptions } = references;
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
      return INIT_REGISTRY.get(init as WeakKey) ?? init;
    }

    // If the value is an array method, set method, or map method,
    // try to get the method trap from the mutator map.
    if (mutator?.has(value)) {
      return mutator?.get(value);
    }

    if (children.has(value)) {
      const proxied = children.get(value) as Linkable;

      if (STATE_REGISTRY.has(proxied) && subscribers.size && !subscriptions.has(proxied)) {
        if (!(recursive === 'flat' && Array.isArray(target))) {
          link(prop as string, proxied);
        }
      }

      return proxied;
    }

    if (recursive && !STATE_REGISTRY.has(value) && linkable(value)) {
      const proxied = anchor(value, {
        schema: (schema as never as ZodObject)?.shape?.[prop as string],
        cloned,
        strict,
        deferred,
        immutable,
        recursive,
      });

      if (!children.has(value)) {
        children.set(value, proxied);
      }

      value = proxied;
    }

    // Link if the value is a reactive state and there is an active subscription.
    // Separating this process from creation is necessary to make sure
    // reading an existing state is linked properly.
    if (STATE_REGISTRY.has(value) && subscribers.size && !subscriptions.has(value)) {
      if (!(recursive === 'flat' && Array.isArray(target))) {
        link(prop as string, value as never);
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

  const { link, unlink, schema, configs, children, subscribers, subscriptions } = references;
  const { cloned, strict, deferred, immutable, recursive } = configs;

  return (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    const current = Reflect.get(target, prop, receiver) as Linkable;

    if (current === value) {
      return true;
    }

    if (schema) {
      const subSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

      if (subSchema) {
        const result = subSchema.safeParse(value);

        if (result.success) {
          value = (result.data ?? value) as Linkable;
        } else {
          for (const issue of result.error.issues) {
            logger.error(`Can not update the value of: "${prop as string}" (${issue.message}).`);
          }

          return !strict;
        }
      }
    }

    if (!STATE_REGISTRY.has(value) && recursive) {
      if (!deferred && linkable(value)) {
        const subSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;
        const proxied = anchor(value, { immutable, deferred, recursive, cloned, strict, schema: subSchema });

        children.set(value, proxied);

        if (subscribers.size && !subscriptions.has(proxied)) {
          if (!(recursive === 'flat' && Array.isArray(target))) {
            link(prop as string, proxied);
          }
        }
      }
    }

    Reflect.set(target, prop, value, receiver);

    if (children.has(current)) {
      children.delete(current);
    }

    if (subscriptions.has(current)) {
      unlink(current);
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(subscribers, target, {
        type: 'set',
        prev: current,
        keys: [prop as string],
        value: target[prop],
      });
    }

    return true;
  };
}

export function createRemover<T, S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Delete trap factory called on non-reactive state.`);
  }

  const { unlink, schema, configs, children, subscribers, subscriptions } = references;
  const { strict } = configs;

  return (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    const subSchema = (schema as never as ZodObject)?.shape?.[prop as string] as ZodType;

    if (subSchema) {
      const result = subSchema.safeParse(undefined);

      if (!result.success) {
        for (const issue of result.error.issues) {
          logger.error(`Can not delete property: "${prop as string}" (${issue.message}).`);
        }

        return !strict;
      }
    }

    const current = Reflect.get(target, prop, receiver) as Linkable;

    Reflect.deleteProperty(target, prop);

    if (children.has(current)) {
      children.delete(current);
    }

    if (subscriptions.has(current)) {
      unlink(current);
    }

    if (!STATE_BUSY_LIST.has(target)) {
      broadcast(subscribers, target, { type: 'delete', prev: current, keys: [prop] });
    }

    return true;
  };
}
