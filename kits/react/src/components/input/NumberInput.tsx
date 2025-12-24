import { classx } from '@anchorkit/headless/utils';
import { type Bindable, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { InputBaseProps } from './types.js';

export type NumberInputType = 'number' | 'range';
export type NumberInputProps = InputBaseProps & {
  type?: NumberInputType;
  value?: Bindable<number>;
};
export const NumberInput = setup<NumberInputProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = parseFloat(e.currentTarget.value);
    props.value = Number.isNaN(value) ? 0 : value;
    props.onChange?.(e);
  };

  return render<NumberInputProps>(
    ({ type = 'number', value = 0, disabled, className }) => (
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className={classx('ark-input', className)}
        {...props.$omit(['type', 'value', 'disabled', 'onChange', 'className'])}
      />
    ),
    'NumberInput'
  );
}, 'NumberInput');
