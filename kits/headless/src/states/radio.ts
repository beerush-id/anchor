import { mutable } from '@anchorlib/core';

export type RadioValue = string | number | boolean;

export type RadioGroupState = {
  value: RadioValue;
  disabled: boolean;
  select(value: RadioValue): void;
};

export type RadioGroupInit = {
  value?: RadioValue;
  disabled?: boolean;
  onChange?: (value: RadioValue) => void;
};

export type RadioState = {
  value: RadioValue;
  checked: boolean;
  disabled: boolean;
  select(): void;
};

export type RadioInit = {
  group?: RadioGroupState;
  value?: RadioValue;
  checked?: boolean;
  disabled?: boolean;
};

export function createRadioGroup(options?: RadioGroupInit): RadioGroupState {
  return mutable<RadioGroupState>({
    value: options?.value ?? '',
    disabled: options?.disabled ?? false,
    select(value: RadioValue) {
      if (this.disabled) return;

      this.value = value;
      options?.onChange?.(value);
    },
  });
}

export function createRadio(options?: RadioInit): RadioState {
  if (options?.group) {
    return mutable<RadioState>({
      value: options?.value ?? '',
      disabled: options?.disabled ?? options?.group.disabled,
      get checked() {
        return options?.group?.value === this.value;
      },
      select() {},
    });
  }

  return mutable<RadioState>({
    value: options?.value ?? '',
    checked: options?.checked ?? false,
    disabled: options?.disabled ?? false,
    select() {
      if (this.disabled) return;
      this.checked = true;
    },
  });
}
