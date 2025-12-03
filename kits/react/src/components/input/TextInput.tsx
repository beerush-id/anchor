import { classx } from '@anchorkit/headless/utils';
import { callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextInputProps } from './types.js';

export const TextInput = setup((props: TextInputProps) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render(() => {
    const { type = 'text', value = '', onChange: _onChange, disabled, className, ...restProps } = props;

    return (
      <input
        type={type}
        value={value}
        onChange={callback(handleChange)}
        disabled={disabled}
        className={classx('ark-input', className)}
        {...restProps}
      />
    );
  }, 'TextInput');
}, 'TextInput');
