import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type SwitchProps = HTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Switch = setup<SwitchProps>((props) => {
  const toggle = () => {
    props.checked = !props.checked;
    props.onChange?.(props.checked);
  };

  return render(() => {
    return (
      <button
        role="switch"
        aria-checked={props.checked}
        aria-disabled={props.disabled}
        className={classx('ark-switch', props.className)}
        disabled={props.disabled}
        onClick={toggle}
        {...props.$omit(['checked', 'disabled', 'onChange', 'className'])}
      ></button>
    );
  }, 'Switch');
}, 'Switch');
