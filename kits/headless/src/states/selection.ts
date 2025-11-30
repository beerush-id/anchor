import { anchor, mutable } from '@anchorlib/core';

export type SelectionInit<T> = {
  selected?: Set<T>;
  disabled?: boolean;
};

export type SelectionItem<T> = {
  value: T;
  disabled?: boolean;
};

export class SelectionState<T> {
  selected: Set<T>;
  disabled: boolean;

  constructor(init?: SelectionInit<T>) {
    this.selected = new Set<T>(init?.selected ?? []);
    this.disabled = init?.disabled ?? false;
  }

  public has(item: T): boolean {
    return this.selected.has(item);
  }

  public select(item: T) {
    if (this.disabled || this.selected.has(item)) return;

    this.selected.add(item);
  }

  public toggle(item: T) {
    if (this.disabled) return;

    if (this.selected.has(item)) {
      this.deselect(item);
    } else {
      this.select(item);
    }
  }

  public deselect(item: T) {
    if (this.disabled) return;

    this.selected.delete(item);
  }

  public clear() {
    if (this.disabled) return;

    this.selected.clear();
  }

  public update(selected: T[]) {
    if (this.disabled) return;

    this.selected.clear();
    anchor.assign(this.selected as never, selected as never);
  }
}

export function createSelection<T>(options?: SelectionInit<T>): SelectionState<T> {
  return mutable(new SelectionState(options));
}
