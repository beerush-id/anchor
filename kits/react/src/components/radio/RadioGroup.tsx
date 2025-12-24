import { createRadioGroup, RadioGroupCtx, type RadioValue } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { type Bindable, contextProvider, effect, onMount, setup, snippet } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type RadioGroupProps = HTMLAttributes<HTMLDivElement> & {
  value?: Bindable<RadioValue>;
  disabled?: boolean;
  onChange?: (value: RadioValue) => void;
  className?: ClassName | ClassList;
};

export const RadioGroup = setup<RadioGroupProps>((props) => {
  const group = createRadioGroup();
  const Context = contextProvider(RadioGroupCtx, 'RadioGroup');

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

  const Content = snippet(
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

  return (
    <Context value={group}>
      <Content />
    </Context>
  );
}, 'RadioGroup');
