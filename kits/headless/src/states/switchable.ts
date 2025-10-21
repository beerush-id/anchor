import { anchor } from '@anchorlib/core';

export enum SelectableDisplay {
  HIDDEN = 'hidden',
  BLANK = 'blank',
}

export type SelectableState<T> = {
  value: T | null;
  disabled: boolean;
  visibility: SelectableDisplay;
  select(name: T): void;
};

export type SelectableInit<T> = {
  value?: T;
  visibility?: SelectableDisplay;
  disabled?: boolean;
};

export function createSelectable<T>(options?: SelectableInit<T>): SelectableState<T> {
  return anchor<SelectableState<T>>({
    value: options?.value ?? null,
    disabled: options?.disabled ?? false,
    visibility: options?.visibility ?? SelectableDisplay.HIDDEN,
    select(name: T) {
      if (this.disabled) return;
      this.value = name;
    },
  });
}
