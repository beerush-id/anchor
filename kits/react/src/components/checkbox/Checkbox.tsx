import { type HTMLAttributes } from 'react';
import { type BindingParam, setup, useBinding, type VariableRef, view } from '@anchorlib/react';
import { createCheckbox } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import type { ObjLike } from '@anchorlib/core';

export type CheckboxProps<B> = HTMLAttributes<HTMLButtonElement> & {
  bind?: BindingParam<boolean, B>;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
  indeterminate?: boolean;
};

function CheckboxSetup<B extends VariableRef<boolean> | ObjLike>({
  bind,
  checked,
  disabled,
  onChange,
  className,
  indeterminate,
  ...props
}: CheckboxProps<B>) {
  const state = useBinding(createCheckbox({ checked, disabled, indeterminate }), 'checked', bind);

  const toggle = () => {
    state.toggle();
    onChange?.(state.checked);
  };

  const CheckboxView = view(() => {
    return (
      <button
        role="checkbox"
        aria-checked={state.ariaChecked}
        aria-disabled={state.disabled}
        className={classx('ark-checkbox', className)}
        disabled={state.disabled}
        onClick={toggle}
        {...props}></button>
    );
  }, 'Checkbox');

  return <CheckboxView />;
}

export const Checkbox = setup(CheckboxSetup, 'Checkbox');
