import { createCheckbox, getCheckboxGroup } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { effect, render, setup } from '@anchorlib/react';
import type { ButtonHTMLAttributes, MouseEventHandler } from 'react';

export type CheckboxProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: ClassName | ClassList;
  onChange?: (checked: boolean) => void;
};

export const Checkbox = setup<CheckboxProps>((props) => {
  const group = getCheckboxGroup();
  const state = createCheckbox({}, group);

  // Sync props to state.
  effect(() => (state.checked = props.checked ?? false));
  effect(() => (state.disabled = props.disabled ?? false));
  effect(() => (state.indeterminate = props.indeterminate ?? false));

  // Sync state to props.
  effect(() => (props.checked = state.checked));

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    state.toggle();

    props.onClick?.(e);
    props.onChange?.(state.checked);
  };

  return render(
    () => (
      <button
        role="checkbox"
        aria-checked={state.ariaChecked}
        aria-disabled={state.disabled ?? group?.disabled}
        disabled={state.disabled ?? group?.disabled}
        className={classx('ark-checkbox', props.className)}
        onClick={handleClick}
      ></button>
    ),
    'Checkbox'
  );
}, 'Checkbox');
