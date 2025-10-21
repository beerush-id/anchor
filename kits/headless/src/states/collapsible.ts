import { anchor } from '@anchorlib/core';

export type CollapsibleGroupState = {
  items: Set<CollapsibleState>;
  multiple: boolean;
  disabled: boolean;
};

export type CollapsibleGroupInit = Partial<CollapsibleGroupState>;

export function createCollapsibleGroup(options?: CollapsibleGroupInit): CollapsibleGroupState {
  return anchor<CollapsibleGroupState>({
    items: options?.items ?? new Set(),
    multiple: options?.multiple ?? false,
    disabled: options?.disabled ?? false,
  });
}

export type CollapsibleState = {
  open: boolean;
  group?: CollapsibleGroupState | null;
  disabled: boolean;
  onChange?: (open: boolean) => void;
  toggle(): void;
};

export type CollapsibleInit = Partial<Omit<CollapsibleState, 'toggle'>>;

export function createCollapsible(options?: CollapsibleInit): CollapsibleState {
  return anchor<CollapsibleState>({
    open: options?.open ?? false,
    group: options?.group ?? null,
    disabled: options?.disabled ?? false,
    onChange: options?.onChange,
    toggle() {
      if (this.disabled) return;

      this.open = !this.open;
      this.onChange?.(this.open);

      if (this.open && this.group && !this.group.multiple) {
        this.group.items.forEach((item) => {
          if (item !== this && item.open) {
            item.open = false;
            item.onChange?.(false);
          }
        });
      }
    },
  });
}
