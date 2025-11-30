import { mutable } from '@anchorlib/core';

export type CheckboxState = {
  checked: boolean;
  disabled: boolean;
  indeterminate: boolean;
  get ariaChecked(): 'true' | 'false' | 'mixed';
  toggle(): void;
};

export type CheckboxInit = Partial<Omit<CheckboxState, 'toggle' | 'ariaChecked'>>;

export function createCheckbox(init?: CheckboxInit): CheckboxState {
  return mutable({
    checked: init?.checked ?? false,
    disabled: init?.disabled ?? false,
    indeterminate: init?.indeterminate ?? false,
    get ariaChecked() {
      return this.checked ? 'true' : this.indeterminate ? 'mixed' : 'false';
    },
    toggle() {
      if (this.disabled) return;
      this.checked = !this.checked;
    },
  });
}
