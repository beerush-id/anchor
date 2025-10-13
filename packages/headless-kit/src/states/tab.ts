import { anchor } from '@anchorlib/core';

export type TabState = {
  active: string;
  disabled: boolean;
  select(name: string): void;
};

export type TabInit = {
  active?: string;
  disabled?: boolean;
};

export function createTab(options?: TabInit): TabState {
  return anchor<TabState>({
    active: options?.active ?? '',
    disabled: options?.disabled ?? false,
    select(name: string) {
      if (this.disabled) return;
      this.active = name;
    },
  });
}
