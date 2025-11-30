import { mutable } from '@anchorlib/core';
import { type SelectionInit, SelectionState } from './selection.js';

export type ComboboxInit<T> = SelectionInit<T> & {
  open?: boolean;
  search?: string;
};

export class ComboboxState<T> extends SelectionState<T> {
  public open: boolean;
  public search: string;

  public constructor(options?: ComboboxInit<T>) {
    super(options);

    this.open = options?.open ?? false;
    this.search = options?.search ?? '';
  }
}

export function createCombobox<T>(options?: ComboboxInit<T>): ComboboxState<T> {
  return mutable(new ComboboxState(options));
}
