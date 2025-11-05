import { type HTMLAttributes, useContext, useMemo } from 'react';
import { setup, view } from '@anchorlib/react';
import { createRadio, type RadioValue } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { RadioGroupContext } from './context.js';

export type RadioProps = HTMLAttributes<HTMLButtonElement> & {
  value?: RadioValue;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: ClassName | ClassList;
};

export const Radio = setup(({ className, value, checked, disabled, onChange, ...props }: RadioProps) => {
  const group = useContext(RadioGroupContext);

  const radio = useMemo(() => {
    return createRadio({ group, value, checked, disabled });
  }, [value, checked, disabled, group]);

  const select = () => {
    if (group) {
      group.select(value ?? '');
    } else {
      radio.select();
    }

    onChange?.(radio.checked);
  };

  const RadioView = view(() => {
    return (
      <button
        role="radio"
        aria-checked={radio.checked}
        aria-disabled={radio.disabled}
        className={classx('ark-radio', className)}
        disabled={radio.disabled}
        onClick={select}
        {...props}
      ></button>
    );
  }, 'Radio');

  return <RadioView />;
}, 'Radio');
