import { getContext, mutable, setContext, shortId } from '@anchorlib/core';

export type CollapsibleGroupState = {
  items: Set<CollapsibleState>;
  value: string;
  multiple: boolean;
  disabled: boolean;
};

export type CollapsibleGroupInit = Partial<CollapsibleGroupState>;

export function createCollapsibleGroup(options?: CollapsibleGroupInit): CollapsibleGroupState {
  return mutable<CollapsibleGroupState>({
    items: options?.items ?? new Set(),
    value: options?.value ?? '',
    multiple: options?.multiple ?? false,
    disabled: options?.disabled ?? false,
  });
}

const CollapsibleGroupCtx = Symbol('ark-collapsible-group');

export function setCollapsibleGroup(options?: CollapsibleGroupInit) {
  const collapsibleGroup = createCollapsibleGroup(options);
  setContext(CollapsibleGroupCtx, collapsibleGroup);
  return collapsibleGroup;
}

export function getCollapsibleGroup() {
  return getContext<CollapsibleGroupState>(CollapsibleGroupCtx);
}

export type CollapsibleState = {
  id: string;
  open: boolean;
  disabled: boolean;
  get expanded(): boolean;
  toggle(): void;

  group?: CollapsibleGroupState | null;
  onChange?: (open: boolean) => void;
};

export type CollapsibleInit = Partial<Omit<CollapsibleState, 'toggle' | 'expanded'>>;

export function createCollapsible(options?: CollapsibleInit): CollapsibleState {
  return mutable<CollapsibleState>({
    id: shortId(),
    open: options?.open ?? false,
    group: options?.group ?? null,
    disabled: options?.disabled ?? false,
    onChange: options?.onChange,
    get expanded() {
      if (this.group) {
        return this.group.value === this.id;
      }

      return this.open;
    },
    toggle() {
      if (this.disabled) return;

      if (this.group) {
        this.group.value = this.group.value === this.id ? '' : this.id;
      } else {
        this.open = !this.open;
      }

      this.onChange?.(this.expanded);
    },
  });
}

const CollapsibleCtx = Symbol('ark-collapsible');

export function setCollapsible(options?: CollapsibleInit) {
  const collapsible = createCollapsible(options);
  setContext(CollapsibleCtx, collapsible);
  return collapsible;
}

export function getCollapsible() {
  return getContext<CollapsibleState>(CollapsibleCtx);
}
