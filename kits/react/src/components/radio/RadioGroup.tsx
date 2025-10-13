import { type HTMLAttributes } from 'react';
import { createRadioGroup, type RadioValue } from '@anchorlib/headless-kit/states';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';
import { RadioGroupContext } from './context.js';
import { setup } from '@anchorlib/react';

export type RadioGroupProps = HTMLAttributes<HTMLDivElement> & {
  value?: RadioValue;
  disabled?: boolean;
  onChange?: (value: RadioValue) => void;
  className?: ClassName | ClassList;
};

export const RadioGroup = setup(({ className, value, disabled, onChange, children, ...props }: RadioGroupProps) => {
  const group = createRadioGroup({ value, disabled, onChange });

  return (
    <RadioGroupContext.Provider value={group}>
      <div role="radiogroup" className={classx('ark-radio-group', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}, 'RadioGroup');
