import type { ZodArray, ZodObject, ZodType } from 'zod/v4';
import type { GetTrapOptions, KeyLike, Linkable, ObjLike, SetTrapOptions, StateMutation } from './types.js';
import { STATE_BUSY_LIST, STATE_REGISTRY } from './registry.js';
import { broadcast, linkable } from './internal.js';
import { logger } from './logger.js';
import { ARRAY_MUTATIONS } from './constant.js';

export function createGetTrap<T, S extends ZodType>(options: GetTrapOptions<T, S>) {
  const { mutator, deferred, cloned, link, strict, schema, anchor, recursive, children, subscribers, subscriptions } =
    options;

  return (target: ObjLike, prop: KeyLike, receiver?: unknown) => {
    let value = Reflect.get(target, prop, receiver) as Linkable;

    if (children.has(value)) {
      const proxied = children.get(value) as Linkable;

      if (STATE_REGISTRY.has(proxied) && subscribers.size && !subscriptions.has(proxied)) {
        if (!(recursive === 'flat' && Array.isArray(target))) {
          link(prop as string, proxied);
        }
      }

      return proxied;
    }

    // If the value is an array method, try to get the mutator for the array.
    if (mutator?.has(value)) {
      return mutator?.get(value);
    }

    if (recursive && !STATE_REGISTRY.has(value) && linkable(value)) {
      const proxied = anchor(value, {
        deferred,
        recursive,
        cloned,
        strict,
        schema: (schema as never as ZodObject)?.shape?.[prop as string],
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
}

export function createSetTrap<T, S extends ZodType>(options: SetTrapOptions<T, S>) {
  const { deferred, recursive, cloned, strict, schema, link, unlink, anchor, children, subscribers, subscriptions } =
    options;

  return (target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) => {
    const current = Reflect.get(target, prop, receiver) as Linkable;

    if (current === value) {
      return true;
    }

    if (!STATE_REGISTRY.has(value) && recursive) {
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

      if (!deferred && linkable(value)) {
        logger.verbose('Creating new reference for property:', prop, 'with value:', value);
        const proxied = anchor(value, { deferred, recursive, cloned, strict, schema: subSchema });

        children.set(value, proxied);

        if (subscribers.size && !subscriptions.has(proxied)) {
          if (!(recursive === 'flat' && Array.isArray(target))) {
            link(prop as string, proxied);
          }
        }
      }
    }

    logger.verbose('Setting property:', prop, 'to value:', value);
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

export function createDeleteTrap<T, S extends ZodType>(options: SetTrapOptions<T, S>) {
  const { strict, schema, unlink, children, subscribers, subscriptions } = options;

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

    logger.verbose('Deleting property:', prop);
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

export function createArrayMutator<T, S extends ZodType>(options: SetTrapOptions<T, S>) {
  const { init, deferred, recursive, cloned, schema, strict, link, unlink, anchor, subscribers, subscriptions } =
    options;
  const mutator = new WeakMap<WeakKey, WeakKey>();

  for (const method of ARRAY_MUTATIONS) {
    const originFn = (init as Array<unknown>)[method] as (...args: unknown[]) => unknown;
    const targetFn = (...args: unknown[]) => {
      // Capture the current items to track the removed items.
      const currentItems = [...(init as ObjLike[])];

      // Create a list of the added items.
      let addedItems: Linkable[] = [];
      let deletedItems: Linkable[] = [];

      if (method === 'splice') {
        const [start, delCount] = args as [number, number];

        if (delCount) {
          deletedItems = currentItems.slice(start, start + delCount);
        }

        // For splice, new items start from index 2 (after start and deleteCount)
        addedItems = args.slice(2) as Linkable[];
      } else if (method === 'fill') {
        // For fill, the same value is used for all elements
        addedItems = [args[0] as Linkable];
      } else if (method === 'push' || method === 'unshift') {
        // For push and unshift, all arguments are new items
        addedItems = args as Linkable[];
      } else if (method === 'shift') {
        deletedItems = [currentItems[0]];
      } else if (method === 'pop') {
        deletedItems = [currentItems[currentItems.length - 1]];
      }

      const addedItemsLength = addedItems.length;
      const deletedItemsLength = deletedItems.length;

      // Validate the added items.
      if (schema && addedItemsLength) {
        const validation = schema.safeParse(addedItems);

        // If validation is successful, update the arguments with validated data.
        if (validation.success) {
          for (let i = 0; i < addedItemsLength; i++) {
            const value = addedItems[i];
            const index = args.indexOf(value);

            if (index > -1) {
              args[index] = (validation.data as unknown[])?.[i] ?? value;
            }
          }
          // If strict mode is enabled and validation fails, throw the error.
        } else if (strict) {
          throw validation.error;
        } else {
          for (const issue of validation.error.issues) {
            logger.error(`Can not invoke method: "${method}" (${issue.message}).`);
          }

          if (method === 'push' || method === 'unshift') {
            return currentItems.length;
          } else if (method === 'splice') {
            return [];
          }

          return init;
        }
      }

      // Eagerly proxy any linkable items inside the arguments before passing to the origin method.
      // This block only runs in eager mode ("deferred" option is off).
      if (recursive && !deferred) {
        // Get the item schema.
        const itemSchema = (schema as never as ZodArray)?.unwrap() as ZodType;
        const argsLength = args.length;

        for (let i = 0; i < argsLength; i++) {
          const item = args[i];

          if (!STATE_REGISTRY.has(item as Linkable) && linkable(item)) {
            args[i] = anchor(item, { deferred, recursive, cloned, strict, schema: itemSchema });
          }
        }
      }

      // Call the original method to perform the operation.
      const result = originFn.apply(init, args);

      let current = currentItems;
      if (['shift', 'pop'].includes(method)) {
        current = result as never;
      }

      // If there are subscribers, recursive linking is enabled, and "deferred" option is off,
      // eagerly link any new items in the array.
      if (subscribers.size && recursive && recursive !== 'flat' && !deferred && addedItemsLength) {
        // Link new items that were added to the array if they are linkable.
        if (method === 'push') {
          // For push, items are added at the end.
          const startIndex = currentItems.length;
          addedItems.forEach((item, i) => {
            if (STATE_REGISTRY.has(item as Linkable)) {
              link(`${startIndex + i}`, item as Linkable);
            }
          });
        } else if (method === 'unshift') {
          // For unshift, items are added at the beginning.
          addedItems.forEach((item, i) => {
            if (STATE_REGISTRY.has(item as Linkable)) {
              link(`${i}`, item as Linkable);
            }
          });
        } else if (method === 'splice') {
          const [start] = args as [number, number];
          addedItems.forEach((item, i) => {
            if (STATE_REGISTRY.has(item as Linkable)) {
              link(`${start + i}`, item as Linkable);
            }
          });
        } else {
          // For other methods like fill, iterate through the state to find new items.
          // Only link if the item is not already linked.
          (init as Linkable[]).forEach((item, i) => {
            if (STATE_REGISTRY.has(item)) {
              // The key for array items is their index.
              link(String(i), item);
            }
          });
        }
      }

      // Unlink the deleted items.
      if (deletedItemsLength) {
        for (const item of deletedItems) {
          if (subscriptions.has(item)) {
            unlink(item as Linkable);
          }
        }
      }

      // Broadcast the array mutation event to all subscribers
      broadcast(subscribers, init, {
        type: method as StateMutation,
        prev: current,
        keys: [],
        value: args,
      });

      return result;
    };

    mutator.set(originFn, targetFn);
  }

  return mutator;
}
