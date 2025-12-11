import { classx } from '@anchorkit/headless/utils';
import { render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { NumberInputProps } from './types.js';

export const NumberInput = setup<NumberInputProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = parseFloat(e.currentTarget.value);
    props.value = Number.isNaN(value) ? 0 : value;
    props.onChange?.(e);
  };

  return render(
    (_, { value = 0, disabled, className }: NumberInputProps) => (
      <input
        type={'number'}
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
