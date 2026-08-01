import { mutable } from '../reactive/index.js';
import type { AnyType } from '../types.js';

export const LIST_OPTIONS = {
  size: 1000,
};

/**
 * Defines the sort order direction.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Configuration options for the SuperList.
 * @template T - The type of items stored in the list.
 */
export type SuperListOptions<T> = Partial<typeof LIST_OPTIONS> & {
  /** Custom sorting function to order the items. */
  sort?: (a: T, b: T) => number;
  /** Property key to order by, and an optional sort direction (default is 'asc'). */
  orderBy?: [keyof T, SortOrder?] | keyof T;
};

/**
 * Represents a reactive wrapper around a single item in the SuperList.
 * It tracks the item's visibility and selection state.
 * @template T - The underlying data type.
 */
export type SuperListItem<T> = {
  /** The actual data value. Undefined if this slot is empty. */
  value?: T;
  /** True if the item is currently selected/checked. */
  checked?: boolean;
  /** True if the item is visible. Can be used for filtering without removing data. */
  visible: boolean;
};

/**
 * A highly performant, reactive list designed for virtualization, sorting, and large datasets.
 * It manages a fixed-size reactive array of wrapping items (`SuperListItem`) to minimize
 * object reallocation and provides robust state tracking for visibility and selection.
 * @template T - The type of data stored in the list.
 */
export class SuperList<T> {
  readonly #size: number;
  readonly #options: SuperListOptions<T>;
  readonly #values: SuperListItem<T>[];
  readonly #cursors = new Set<number>();
  readonly #indexes = mutable(new Map<number, T>(), { recursive: false });
  readonly #selection = mutable(new Set<T>(), { recursive: false });

  /**
   * The current number of populated items in the list.
   */
  public get size() {
    return this.#indexes.size;
  }

  /**
   * The configuration options assigned to this list.
   */
  public get options() {
    return this.#options;
  }

  /**
   * The fixed-size array of wrapped items.
   * Access this property to render items. The length of this array is always `options.size`.
   */
  public get values() {
    return this.#values;
  }

  /**
   * A reactive Set containing all currently selected (checked) data values.
   */
  public get selection() {
    return this.#selection;
  }

  /**
   * A Map of the active indices to their corresponding data values.
   */
  public get indexes() {
    return this.#indexes;
  }

  /**
   * Creates a new SuperList instance.
   * @param values - Optional initial array of values to populate the list.
   * @param options - Configuration options, including the max size and sorting rules.
   */
  constructor(values?: T[], options: SuperListOptions<T> = {}) {
    this.#options = { ...LIST_OPTIONS, ...options };

    if (typeof this.#options.sort !== 'function') {
      delete this.#options.sort;
    }
    if (!this.#options.sort && this.#options.orderBy) {
      const [key, order] = Array.isArray(this.#options.orderBy)
        ? this.#options.orderBy
        : [this.#options.orderBy, 'asc'];
      if (key !== undefined && key !== null) {
        this.#options.sort = this.#createSortFn(key as keyof T, order === 'desc' ? 'desc' : 'asc');
      }
    }
    const rawSize = this.#options.size;
    const size = Number.isInteger(rawSize) && rawSize! > 0 ? rawSize! : LIST_OPTIONS.size;
    this.#options.size = size;

    this.#size = size;
    this.#values = Array.from({ length: size }, () => {
      return mutable({ visible: true }, { recursive: false }) as SuperListItem<T>;
    });

    if (Array.isArray(values) && values.length) {
      this.add(values);
    }
  }

  /**
   * Appends new values to the end of the list (or redistributes them if sorting is enabled).
   * @param values - An array of items to add.
   * @throws Will throw if the total size exceeds the configured maximum capacity.
   * @returns The current instance for chaining.
   */
  public add(values: T[]) {
    if (!Array.isArray(values) || !values.length) return this;

    const start = this.#cursors.size;
    const end = start + values.length;
    if (end > this.#size) {
      throw new Error(
        `List capacity exceeded: cannot add ${values.length} items (exceeds maximum capacity of ${this.#size}).`
      );
    }

    const shouldSort = typeof this.#options.sort === 'function';

    for (let i = start; i < end; i += 1) {
      const val = this.#normalize(values[i - start]);

      if (!shouldSort) {
        this.#values[i].value = val;
      }

      this.#cursors.add(i);
      this.#indexes.set(i, val);
    }

    if (shouldSort) {
      this.#redistribute();
    }

    return this;
  }

  /**
   * Replaces the entire list content with the new values.
   * Cleans up excess items and updates selections if they are no longer present.
   * @param values - The new array of items to populate the list.
   * @throws Will throw if the new size exceeds the configured maximum capacity.
   * @returns The current instance for chaining.
   */
  public assign(values?: T[]) {
    if (!Array.isArray(values) || !values.length) return this;

    const size = values.length;
    if (size > this.#size) {
      throw new Error(
        `List capacity exceeded: cannot assign ${size} items (exceeds maximum capacity of ${this.#size}).`
      );
    }

    const oldCursorSize = this.#cursors.size;
    const sorted = this.#options.sort ? values.map((v) => this.#normalize(v)).sort(this.#options.sort) : null;

    for (let i = 0; i < size; i += 1) {
      const row = this.#values[i];
      const val = sorted ? sorted[i] : this.#normalize(values[i]);

      if (row.checked && row.value !== val) {
        this.#selection.delete(row.value!);
        row.checked = false;
      }

      row.value = val;
      this.#cursors.add(i);
      this.#indexes.set(i, val);
    }

    if (oldCursorSize > size) {
      for (let i = size; i < oldCursorSize; i += 1) {
        const row = this.#values[i];
        if (row.checked) {
          this.#selection.delete(row.value!);
          row.checked = false;
        }
        row.value = undefined;
        this.#cursors.delete(i);
        this.#indexes.delete(i);
      }
    }

    return this;
  }

  /**
   * Updates an item at a specific index.
   * If sorting is enabled, this will trigger a redistribution of the entire list.
   * @param index - The index of the item to update.
   * @param value - The new value to set.
   * @throws Will throw if the index is out of bounds.
   * @returns The current instance for chaining.
   */
  public set(index: number, value: T) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#cursors.size) {
      throw new Error(`Out of bounds: index ${index} is outside of the allocated list size (${this.#cursors.size}).`);
    }

    const row = this.#values[index];
    const val = this.#normalize(value);

    if (row.checked) {
      this.#selection.delete(row.value!);
      row.checked = false;
    }

    this.#indexes.set(index, val);

    if (this.#options.sort) {
      this.#redistribute();
    } else {
      row.value = val;
    }

    return this;
  }

  /**
   * Removes one or more items starting from the specified index.
   * Any removed item that was selected will also be removed from the selection Set.
   * @param start - The starting index.
   * @param size - The number of items to remove (default is 1).
   * @throws Will throw if the start index or size is out of bounds.
   * @returns The current instance for chaining.
   */
  public delete(start: number, size = 1) {
    if (!Number.isInteger(start) || start < 0 || start >= this.#cursors.size || !Number.isInteger(size) || size < 0) {
      throw new Error(
        `Out of bounds: start index ${start} is outside of the allocated list size (${this.#cursors.size}).`
      );
    }

    const length = Math.min(start + size, this.#cursors.size);
    for (let i = start; i < length; i += 1) {
      const row = this.#values[i];
      if (row.checked) {
        row.checked = false;
        this.#selection.delete(row.value!);
      }

      row.value = undefined;
      this.#indexes.delete(i);
    }

    return this;
  }

  /**
   * Makes one or more items visible.
   * Used primarily for reactive filtering.
   * @param start - The starting index.
   * @param size - The number of items to show (default is 1).
   * @returns The current instance for chaining.
   */
  public show(start: number, size = 1) {
    if (!Number.isInteger(start) || start < 0 || start >= this.#cursors.size || !Number.isInteger(size) || size <= 0) {
      return this;
    }

    const length = Math.min(start + size, this.#cursors.size);
    for (let i = start; i < length; i += 1) {
      this.#values[i].visible = true;
    }
    return this;
  }

  /**
   * Hides one or more items.
   * Used primarily for reactive filtering without removing the item from data.
   * @param start - The starting index.
   * @param size - The number of items to hide (default is 1).
   * @returns The current instance for chaining.
   */
  public hide(start: number, size = 1) {
    if (!Number.isInteger(start) || start < 0 || start >= this.#cursors.size || !Number.isInteger(size) || size <= 0) {
      return this;
    }

    const length = Math.min(start + size, this.#cursors.size);
    for (let i = start; i < length; i += 1) {
      this.#values[i].visible = false;
    }
    return this;
  }

  /**
   * Toggles the selection state (checked) of an item at the given index.
   * @param index - The index of the item.
   * @param checked - Optional forced boolean state. If omitted, toggles the current state.
   * @returns The current instance for chaining.
   */
  public toggle(index: number, checked?: boolean) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#cursors.size) return this;

    const row = this.#values[index];
    if (row.value === undefined) return this;

    const next = checked ?? !row.checked;
    if (next === row.checked) return this;

    row.checked = next;
    if (next) {
      this.#selection.add(row.value);
    } else {
      this.#selection.delete(row.value);
    }

    return this;
  }

  /**
   * Forces the selection of the item at the given index.
   * @param index - The index to select.
   * @returns The current instance for chaining.
   */
  public select(index: number) {
    return this.toggle(index, true);
  }

  /**
   * Deselects the item at the given index.
   * @param index - The index to deselect.
   * @returns The current instance for chaining.
   */
  public deselect(index: number) {
    return this.toggle(index, false);
  }

  /**
   * Clears the entire list, dropping all values, selections, and cursors.
   * @returns The current instance for chaining.
   */
  public clear() {
    for (const index of this.#indexes.keys()) {
      const row = this.#values[index];
      row.value = undefined;
      row.checked = false;
    }

    this.#cursors.clear();
    this.#indexes.clear();
    this.#selection.clear();
    return this;
  }

  public sort(fn?: (a: T, b: T) => number) {
    if (typeof fn === 'function') {
      this.#options.sort = fn;
    }

    if (this.#options.sort && this.#indexes.size > 0) {
      this.#redistribute();
    }

    return this;
  }

  public orderBy(key: keyof T, order?: SortOrder) {
    if (key === undefined || key === null) return this;
    const sortOrder = order === 'desc' ? 'desc' : 'asc';
    this.#options.orderBy = [key, sortOrder];
    return this.sort(this.#createSortFn(key, sortOrder));
  }

  #normalize(value: T): T {
    return value === undefined ? (null as unknown as T) : value;
  }

  #createSortFn(key: keyof T, order: SortOrder = 'asc'): (a: T, b: T) => number {
    return (a: T, b: T) => {
      const valA = (a as AnyType)?.[key];
      const valB = (b as AnyType)?.[key];

      const aNil = valA === undefined || valA === null;
      const bNil = valB === undefined || valB === null;
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;
      if (valA === valB) return 0;

      let result: number;
      if (typeof valA === 'string' && typeof valB === 'string') {
        result = valA.localeCompare(valB);
      } else if (valA > valB) {
        result = 1;
      } else {
        result = -1;
      }

      return order === 'desc' ? -result : result;
    };
  }

  #redistribute() {
    const keys = Array.from(this.#indexes.keys()).sort((a, b) => a - b);
    const sorted = keys.map((k) => this.#indexes.get(k)!).sort(this.#options.sort!);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const val = sorted[i];
      this.#values[key].value = val; // Object write — Anchor deduplicates.
      if (this.#indexes.get(key) !== val) {
        this.#indexes.set(key, val); // Collection write — guard to avoid notification.
      }
    }
  }
}

/**
 * Creates a new reactive SuperList instance.
 * 
 * @template T - The type of data stored in the list.
 * @param values - Optional initial array of values to populate the list.
 * @param options - Configuration options, including the max size and sorting rules.
 * @returns A newly instantiated `SuperList`.
 */
export function superList<T>(values?: T[], options?: SuperListOptions<T>) {
  return new SuperList<T>(values, options);
}
