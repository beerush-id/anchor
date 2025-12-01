import { classx } from '@anchorkit/headless/utils';
import { callback, setup, template } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextInputProps } from './types.js';

export const TextInput = setup((props: TextInputProps) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  const Template = template(() => {
    const { type: _type, value = '', onChange: _onChange, disabled, className, ...restProps } = props;

    return (
      <input
        type={'text'}
        value={value}
        onChange={callback(handleChange)}
        disabled={disabled}
        className={classx('ark-input', className)}
        {...restProps}
      />
    );
  }, 'TextInputElement');

  return <Template />;
}, 'TextInput');
