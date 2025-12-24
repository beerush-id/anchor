import { classx } from '@anchorkit/headless/utils';
import { type Bindable, callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { InputBaseProps } from './types.js';

export type TextInputType = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';
export type TextInputProps = InputBaseProps & {
  type?: TextInputType;
  value?: Bindable<string>;
};

export const TextInput = setup<TextInputProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render<TextInputProps>(
    ({ type = 'text', value = '', disabled, className }) => (
      <input
        type={type}
        value={value}
        onChange={callback(handleChange)}
        disabled={disabled}
        className={classx('ark-input', className)}
        {...props.$omit(['type', 'value', 'disabled', 'className', 'onChange'])}
      />
    ),
    'TextInput'
  );
}, 'TextInput');
