import { getContext, mutable, setContext } from '@anchorlib/core';

export type RadioValue = string | number | boolean;

export interface RadioGroupInit {
  value?: RadioValue;
  disabled?: boolean;
}

export class RadioGroup {
  public value: RadioValue = '';
  public disabled = false;

  constructor(options?: RadioGroupInit) {
    Object.assign(this, { ...options });
  }
}

export const RadioGroupCtx = Symbol('RadioGroup');

export function createRadioGroup(options?: RadioGroupInit): RadioGroup {
  return mutable(new RadioGroup(options), { recursive: false });
}

export function getRadioGroup() {
  return getContext<RadioGroup>(RadioGroupCtx);
}

export function setRadioGroup(group: RadioGroup) {
  return setContext(RadioGroupCtx, group);
}
