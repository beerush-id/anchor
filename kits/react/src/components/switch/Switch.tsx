import { type HTMLAttributes } from 'react';
import { setup, view } from '@anchorlib/react';
import { createToggle } from '@anchorlib/headless-kit/states';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';

export type SwitchProps = HTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Switch = setup(({ className, checked, disabled, onChange, ...props }: SwitchProps) => {
  const switchState = createToggle({ checked, disabled });

  const toggle = () => {
    switchState.toggle();
    onChange?.(switchState.checked);
  };

  const SwitchView = view(() => {
    return (
      <button
        role="switch"
        aria-checked={switchState.checked}
        aria-disabled={switchState.disabled}
        className={classx('ark-switch', className)}
        disabled={switchState.disabled}
        onClick={toggle}
        {...props}></button>
    );
  }, 'Switch');

  return <SwitchView />;
}, 'Switch');
