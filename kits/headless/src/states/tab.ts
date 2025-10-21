import { anchor, getContext, setContext, shortId } from '@anchorlib/core';

export enum TabVisibility {
  HIDDEN = 'hidden',
  BLANK = 'blank',
}

export type TabState = {
  id: string;
  active: string;
  disabled: boolean;
  visibility: TabVisibility;
  select(name: string): void;
};

export type TabInit = {
  active?: string;
  visibility?: TabVisibility;
  disabled?: boolean;
};

export const TabCtx = Symbol('ark-tab');

export function createTab(options?: TabInit): TabState {
  return anchor<TabState>({
    id: shortId(),
    active: options?.active ?? '',
    disabled: options?.disabled ?? false,
    visibility: options?.visibility ?? TabVisibility.HIDDEN,
    select(name: string) {
      if (this.disabled) return;
      this.active = name;
    },
  });
}

export function setTab(options?: TabInit) {
  const tab = createTab(options);
  setContext(TabCtx, tab);
  return tab;
}

export function getTab() {
  return getContext<TabState>(TabCtx);
}
