import { type Enum, getContext, mutable, shortId } from '@anchorlib/core';

export const TabVisibility = {
  HIDDEN: 'hidden',
  BLANK: 'blank',
} as const;

export type TabVisibility = Enum<typeof TabVisibility>;

export const TabCtx = Symbol('ark-tab');

export interface TabInit {
  active?: string;
  visibility?: TabVisibility;
  disabled?: boolean;
}

export class TabState {
  public id = shortId();
  public active = '';
  public disabled = false;
  public visibility: TabVisibility = TabVisibility.HIDDEN;
  public items: string[] = [];

  constructor(options?: TabInit) {
    Object.assign(this, options ?? {});
  }

  public insert(name: string): void {
    if (!this.items.includes(name)) {
      this.items.push(name);
    }
  }

  public remove(name: string): void {
    const index = this.items.indexOf(name);

    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  public select(name: string): void {
    if (this.disabled) return;
    this.active = name;
    console.log(this);
  }

  public prev(): void {
    const activeIndex = this.items.indexOf(this.active);

    if (activeIndex <= 0) {
      this.select(this.items[this.items.length - 1]);
    } else {
      this.select(this.items[activeIndex - 1]);
    }
  }

  public next(): void {
    const activeIndex = this.items.indexOf(this.active);

    if (activeIndex >= this.items.length - 1) {
      this.select(this.items[0]);
    } else {
      this.select(this.items[activeIndex + 1]);
    }
  }
}

export function createTab(options?: TabInit): TabState {
  return mutable(new TabState(options));
}

export function isTabState(value: unknown): value is TabState {
  return value instanceof TabState;
}

export function getTab() {
  return getContext<TabState>(TabCtx);
}
