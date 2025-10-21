import { anchor } from '@anchorlib/core';

export type ToggleState = {
  checked: boolean;
  disabled?: boolean;
  toggle(): void;
};

export type ToggleOptions = {
  checked?: boolean;
  disabled?: boolean;
};

export function createToggle(options?: ToggleOptions): ToggleState {
  return anchor<ToggleState>({
    checked: options?.checked ?? false,
    disabled: options?.disabled ?? false,
    toggle() {
      if (this.disabled) return;
      this.checked = !this.checked;
    },
  });
}
