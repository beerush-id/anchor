import type { ZodArray, ZodType } from 'zod/v4';
import type { Linkable, MethodLike, ObjLike, StateMutation, StateReferences } from './types.js';
import { INIT_REGISTRY, REFERENCE_REGISTRY, STATE_REGISTRY } from './registry.js';
import { ARRAY_MUTATIONS } from './constant.js';
import { broadcast, linkable } from './internal.js';
import { logger } from './logger.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';

const mockReturn = {
  shift(items: unknown[]) {
    return items[0];
  },
  unshift(items: unknown[]) {
    return items.length;
  },
  push(items: unknown[]) {
    return items.length;
  },
  pop(items: unknown[]) {
    return items[items.length - 1];
  },
  splice(items: unknown[], start: number, deleteCount?: number) {
    const actualStart = start < 0 ? Math.max(items.length + start, 0) : Math.min(start, items.length);
    const actualDeleteCount =
      deleteCount === undefined
        ? items.length - actualStart
        : Math.min(Math.max(deleteCount, 0), items.length - actualStart);
    return items.slice(actualStart, actualStart + actualDeleteCount);
  },
  fill(items: unknown[]) {
    return items;
  },
  sort(items: unknown[]) {
    return items;
  },
  reverse(items: unknown[]) {
    return items;
  },
};

export function createArrayMutator<T extends unknown[], S extends ZodType>(init: T, options?: StateReferences<T, S>) {
  const references = (options ?? REFERENCE_REGISTRY.get(init as WeakKey)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Array trap factory called on non-reactive state.`);
  }

  const { link, unlink, schema, configs, subscribers, subscriptions } = references;
  const { cloned, strict, deferred, immutable, recursive } = configs;

  const mutator = new WeakMap<WeakKey, MethodLike>();

  if (immutable) {
    for (const method of ARRAY_MUTATIONS) {
      const originFn = (init as Array<unknown>)[method] as (...args: unknown[]) => unknown;
      const targetFn: MethodLike = (...args) => {
        captureStack.violation.methodCall(method, targetFn);
        return (mockReturn[method as never] as typeof targetFn)?.(INIT_REGISTRY.get(init as WeakKey), ...args);
      };

      mutator.set(originFn, targetFn);
    }

    return mutator;
  }

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
            args[i] = anchor(item, { immutable, deferred, recursive, cloned, strict, schema: itemSchema });
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

      if (result === init) {
        return INIT_REGISTRY.get(init as WeakKey);
      }

      return result;
    };

    mutator.set(originFn, targetFn);
  }

  return mutator;
}

createArrayMutator.mock = mockReturn;
