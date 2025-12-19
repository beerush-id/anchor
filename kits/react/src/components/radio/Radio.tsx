import { getRadioGroup, type RadioValue } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { derived, render, setup } from '@anchorlib/react';
import type { ButtonHTMLAttributes, MouseEventHandler } from 'react';

export type RadioProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value?: RadioValue;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Radio = setup<RadioProps>((props) => {
  const group = getRadioGroup();
  if (group && props.checked && props.value) group.value = props.value;

  const checked = derived(() => (group ? group.value === props.value : props.checked));
  const disabled = derived(() => props.disabled || group?.disabled);

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    props.checked = true;

    if (group && props.value) group.value = props.value;

    props.onChange?.(props.checked);
    props.onClick?.(e);
  };

  return render(
    () => (
      <button
        role="radio"
        aria-checked={checked.value}
        aria-disabled={disabled.value}
        className={classx('ark-radio', props.className)}
        disabled={disabled.value}
        onClick={handleClick}
        {...props.$omit(['value', 'checked', 'disabled', 'onChange', 'className'])}
      ></button>
    ),
    'Radio'
  );
}, 'Radio');
