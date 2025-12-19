export interface SelectionItem {
  value: string;
  disabled?: boolean;
}

export interface SelectionInit {
  value?: SelectionItem['value'];
  disabled?: boolean;
}

export class Selection {
  public items: SelectionItem[] = [];
  public value: SelectionItem['value'] = '';
  public disabled: boolean = false;

  public get currentIndex() {
    return this.items.findIndex((i) => i.value === this.value);
  }

  public get prevIndex() {
    return (this.currentIndex - 1 + this.items.length) % this.items.length;
  }

  public get prevItem() {
    return this.items[this.prevIndex];
  }

  public get nextIndex() {
    return (this.currentIndex + 1) % this.items.length;
  }

  public get nextItem() {
    return this.items[this.nextIndex];
  }

  public constructor(options?: SelectionInit) {
    Object.assign(this, { ...options });
  }

  public insert(item: SelectionItem): this {
    if (!this.items.find((c) => c.value === item.value)) {
      this.items.push(item);
    }

    return this;
  }

  public remove(item: SelectionItem['value']): this {
    const index = this.items.findIndex((c) => c.value === item);

    if (index >= 0) {
      this.items.splice(index, 1);
    }

    return this;
  }

  public select(value: SelectionItem['value']): this {
    if (this.disabled || !this.items.length) return this;

    this.value = value;
    return this;
  }

  public prev() {
    return this.select(this.prevItem?.value);
  }

  public next() {
    return this.select(this.nextItem?.value);
  }
}

export interface MultipleSelectionInit {
  value?: SelectionItem['value'][];
  disabled?: boolean;
}

export class MultipleSelection {
  public items: SelectionItem[] = [];
  public value: SelectionItem['value'][] = [];
  public disabled = false;

  constructor(options?: MultipleSelectionInit) {
    Object.assign(this, { ...options });
  }

  public insert(item: SelectionItem): this {
    if (!this.items.find((c) => c.value === item.value)) {
      this.items.push(item);
    }

    return this;
  }

  public remove(value: SelectionItem['value']): this {
    const index = this.items.findIndex((c) => c.value === value);

    if (index >= 0) {
      this.items.splice(index, 1);
    }

    return this;
  }

  public select(value: SelectionItem['value']): this {
    if (this.disabled) return this;

    if (!this.value.includes(value)) {
      this.value.push(value);
    }

    return this;
  }

  public deselect(value: SelectionItem['value']): this {
    if (this.disabled) return this;

    const index = this.value.indexOf(value);
    if (index >= 0) {
      this.value.splice(index, 1);
    }

    return this;
  }

  public toggle(value: SelectionItem['value']): this {
    if (this.disabled) return this;

    if (this.value.includes(value)) {
      this.deselect(value);
    } else {
      this.select(value);
    }

    return this;
  }
}
