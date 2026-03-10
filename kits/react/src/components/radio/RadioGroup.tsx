import { createRadioGroup, type RadioValue } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { type Bindable, effect, onMount, render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type RadioGroupProps = HTMLAttributes<HTMLDivElement> & {
  value?: Bindable<RadioValue>;
  disabled?: boolean;
  onChange?: (value: RadioValue) => void;
  className?: ClassName | ClassList;
};

export const RadioGroup = setup<RadioGroupProps>((props) => {
  const group = createRadioGroup();

  let mounted = false;

  effect(() => {
    group.value = props.value ?? '';
    group.disabled = props.disabled ?? false;
  });

  effect(() => {
    props.value = group.value;

    if (mounted) {
      props.onChange?.(group.value);
    }
  });

  onMount(() => {
    mounted = true;
  });

  return render(
    () => (
      <div
        role="radiogroup"
        className={classx('ark-radio-group', props.className)}
        {...props.$omit(['className', 'value', 'disabled', 'onChange'])}
      >
        {props.children}
      </div>
    ),
    'RadioGroup'
  );
}, 'RadioGroup');
