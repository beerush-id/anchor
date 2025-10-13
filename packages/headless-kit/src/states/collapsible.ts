import { anchor } from '@anchorlib/core';

export type CollapsibleState = {
  open: boolean;
  disabled: boolean;
  toggle(): void;
};

export type CollapsibleOptions = {
  open?: boolean;
  disabled?: boolean;
};

export function createCollapsible(options?: CollapsibleOptions): CollapsibleState {
  return anchor<CollapsibleState>({
    open: options?.open ?? false,
    disabled: options?.disabled ?? false,
    toggle() {
      if (this.disabled) return;
      this.open = !this.open;
    },
  });
}
