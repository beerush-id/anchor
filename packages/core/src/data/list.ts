import { mutable } from '../reactive/index.ts';
import type { AnyType } from '../types.ts';

export const LIST_OPTIONS = {
  size: 1000,
};

export type SortOrder = 'asc' | 'desc';

export type SuperListOptions<T> = Partial<typeof LIST_OPTIONS> & {
  sort?: (a: T, b: T) => number;
  orderBy?: [keyof T, SortOrder?] | keyof T;
};

export type SuperListItem<T> = {
  value?: T;
  checked?: boolean;
  visible: boolean;
};

export class SuperList<T> {
  readonly #size: number;
  readonly #options: SuperListOptions<T>;
  readonly #values: SuperListItem<T>[];
  readonly #cursors = new Set<number>();
  readonly #indexes = mutable(new Map<number, T>(), { recursive: false });
  readonly #selection = mutable(new Set<T>(), { recursive: false });

  public get size() {
    return this.#indexes.size;
  }

  public get options() {
    return this.#options;
  }

  public get values() {
    return this.#values;
  }

  public get selection() {
    return this.#selection;
  }

  public get indexes() {
    return this.#indexes;
  }

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

  public select(index: number) {
    return this.toggle(index, true);
  }

  public deselect(index: number) {
    return this.toggle(index, false);
  }

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

export function superList<T>(values?: T[], options?: SuperListOptions<T>) {
  return new SuperList<T>(values, options);
}
