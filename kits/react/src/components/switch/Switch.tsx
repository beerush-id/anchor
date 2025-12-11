import { createToggle } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { effect, render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type SwitchProps = HTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Switch = setup<SwitchProps>((props) => {
  const state = createToggle();

  effect(() => (state.checked = props.checked ?? false));
  effect(() => (state.disabled = props.disabled ?? false));

  const toggle = () => {
    state.toggle();
    props.checked = state.checked;
    props.onChange?.(state.checked);
  };

  return render(() => {
    return (
      <button
        role="switch"
        aria-checked={state.checked}
        aria-disabled={state.disabled}
        className={classx('ark-switch', props.className)}
        disabled={state.disabled}
        onClick={toggle}
        {...props.$omit(['checked', 'disabled', 'onChange', 'className'])}
      ></button>
    );
  }, 'Switch');
}, 'Switch');
