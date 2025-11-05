import { type HTMLAttributes } from 'react';
import { type BindingParam, setup, useBinding, view } from '@anchorlib/react';
import { createToggle } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';

export type SwitchProps<C, D> = HTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  bindChecked?: BindingParam<boolean, C>;
  disabled?: boolean;
  bindDisabled?: BindingParam<boolean, D>;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Switch = setup(function Switch<C, D>({
  checked,
  bindChecked,
  disabled,
  bindDisabled,
  onChange,
  className,
  ...props
}: SwitchProps<C, D>) {
  const state = createToggle({ checked, disabled });

  useBinding(state, 'checked', bindChecked);
  useBinding(state, 'disabled', bindDisabled);

  const toggle = () => {
    state.toggle();
    onChange?.(state.checked);
  };

  const SwitchView = view(() => {
    return (
      <button
        role="switch"
        aria-checked={state.checked}
        aria-disabled={state.disabled}
        className={classx('ark-switch', className)}
        disabled={state.disabled}
        onClick={toggle}
        {...props}
      ></button>
    );
  }, 'Switch');

  return <SwitchView />;
}, 'Switch');
