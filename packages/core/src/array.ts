import type { ZodType } from 'zod/v4';
import type { Linkable, MethodLike, ObjLike, StateMutation, StateReferences } from './types.js';
import { INIT_REGISTRY, REFERENCE_REGISTRY } from './registry.js';
import { ARRAY_MUTATIONS } from './constant.js';
import { broadcast } from './internal.js';
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
  splice() {
    return [];
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

  const { unlink, schema, configs, subscribers, subscriptions } = references;
  const { strict, immutable } = configs;

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
              args[index] = (validation.data as unknown[])?.[i];
            }
          }
          // If strict mode is enabled and validation fails, throw the error.
        } else {
          captureStack.error.validation(
            `Attempted to mutate: "${method}" of an array with invalid input:`,
            validation.error,
            strict,
            targetFn
          );

          if (method === 'push' || method === 'unshift') {
            return currentItems.length;
          } else if (method === 'splice') {
            return [];
          }

          return INIT_REGISTRY.get(init);
        }
      }

      // Call the original method to perform the operation.
      const result = originFn.apply(init, args);

      let current = currentItems;
      if (['shift', 'pop'].includes(method)) {
        current = result as never;
      }

      // Unlink the deleted items.
      if (deletedItemsLength) {
        for (const item of deletedItems) {
          const childState = INIT_REGISTRY.get(item) as Linkable;
          if (subscriptions.has(childState)) {
            unlink(childState);
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
