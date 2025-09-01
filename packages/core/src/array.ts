import type {
  Linkable,
  LinkableSchema,
  MethodLike,
  ObjLike,
  StateChange,
  StateMetadata,
  StateMutation,
  StateReferences,
} from './types.js';
import { INIT_REGISTRY, META_REGISTRY, REFERENCE_REGISTRY, SORTER_REGISTRY } from './registry.js';
import { ARRAY_MUTATIONS, OBSERVER_KEYS } from './constant.js';
import { broadcast } from './internal.js';
import { captureStack } from './exception.js';
import { getDevTool } from './dev.js';
import { isFunction } from '@beerush/utils';

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

// Define the max number of items additions to switch between using sort vs splice
// when adding an item into an ordered list.
const HEURISTIC_THRESHOLD = 5;

/**
 * Creates a mutator for an array that handles state changes and validation.
 *
 * This function creates a WeakMap of method proxies for array mutation methods.
 * It handles both mutable and immutable array operations, including:
 * - Validation of new items against a schema
 * - Broadcasting of state changes to subscribers
 * - Proper linking/unlinking of array elements
 * - Handling of immutable arrays by returning mock values
 *
 * @template T - The type of the array
 * @template S - The schema type for validation
 * @param init - The initial array state
 * @param options - Optional state references containing schema, configs, and subscribers
 * @returns A WeakMap mapping original array methods to their proxied implementations
 * @throws Error if called on a non-reactive state (when no references are found)
 */
export function createArrayMutator<T extends unknown[], S extends LinkableSchema>(
  init: T,
  options?: StateReferences<T, S>
) {
  const references = (options ?? REFERENCE_REGISTRY.get(init)) as StateReferences<T, S>;

  if (!references) {
    throw new Error(`Array trap factory called on non-reactive state.`);
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const devTool = getDevTool();
  const { schema, observers, subscribers, subscriptions } = meta;
  const { unlink, configs } = references;
  const compare = SORTER_REGISTRY.get(init);

  const mutator = new WeakMap<WeakKey, MethodLike>();

  if (configs.immutable) {
    for (const method of ARRAY_MUTATIONS) {
      const originFn = (init as Array<unknown>)[method] as (...args: unknown[]) => unknown;
      const targetFn: MethodLike = (...args) => {
        captureStack.violation.methodCall(method, targetFn);
        return (mockReturn[method as never] as typeof targetFn)?.(INIT_REGISTRY.get(init), ...args);
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
        } else {
          captureStack.error.validation(
            `Attempted to mutate: "${method}" of an array with invalid input:`,
            validation.error,
            configs.strict,
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
      let result: unknown;

      if (method === 'push' && configs.ordered && isFunction(compare)) {
        if (addedItems.length <= HEURISTIC_THRESHOLD) {
          for (const item of addedItems) {
            orderedPush(init, item, compare);
          }

          result = init.length;
        } else {
          originFn.apply(init, args);
          init.sort(compare);
          result = init.length;
        }
      } else {
        result = originFn.apply(init, args);
      }

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

      const event: StateChange = {
        type: method as StateMutation,
        prev: current,
        keys: [],
        value: args,
      };

      if (observers.size) {
        for (const observer of observers) {
          if (observer.states.get(init)?.has(OBSERVER_KEYS.ARRAY_MUTATIONS)) {
            observer.onChange(event);
          }
        }
      }

      // Broadcast the array mutation event to all subscribers
      broadcast(subscribers, init, event, meta.id);

      devTool?.onCall?.(meta, method, args);

      if (result === init) {
        return INIT_REGISTRY.get(init);
      }

      return result;
    };

    mutator.set(originFn, targetFn);
  }

  return mutator;
}

createArrayMutator.mock = mockReturn;

/**
 * Inserts an item into an array at the correct position to maintain sorted order.
 *
 * This function uses binary search to find the correct insertion point for the item
 * based on the provided comparison function. The array must already be sorted
 * according to the same comparison function for the result to be correctly sorted.
 *
 * @template T - The type of elements in the array
 * @param target - The sorted array to insert the item into
 * @param item - The item to insert
 * @param compare - A function that defines the sort order. It should return:
 *   - A negative value if the first argument is less than the second
 *   - Zero if the first argument is equal to the second
 *   - A positive value if the first argument is greater than the second
 */
export function orderedPush<T>(target: T[], item: T, compare: (a: T, b: T) => number): void {
  target.splice(orderedIndexOf(target, item, compare), 0, item);
}

/**
 * Finds the index at which an item should be inserted into a sorted array to maintain sort order.
 *
 * This function uses binary search to efficiently determine the correct insertion point
 * for the item based on the provided comparison function. The array must already be sorted
 * according to the same comparison function for the result to be correct.
 *
 * @template T - The type of elements in the array
 * @param target - The sorted array to search
 * @param item - The item to find the insertion index for
 * @param compare - A function that defines the sort order. It should return:
 *   - A negative value if the first argument is less than the second
 *   - Zero if the first argument is equal to the second
 *   - A positive value if the first argument is greater than the second
 * @returns The index at which the item should be inserted to maintain sorted order
 */
export function orderedIndexOf<T>(target: T[], item: T, compare: (a: T, b: T) => number): number {
  let low = 0;
  let high = target.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const result = compare(target[mid], item);

    if (result <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}
