import { classx } from '@anchorkit/headless/utils';
import { setup, template } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { NumberInputProps } from './types.js';

export const NumberInput = setup((props: NumberInputProps) => {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = parseFloat(e.currentTarget.value);
    props.value = Number.isNaN(value) ? 0 : value;
    props.onChange?.(e);
  };

  const Template = template(() => {
    const { type: _type, onChange: _onChange, value = '', disabled, className, ...restProps } = props;

    return (
      <input
        type={'number'}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className={classx('ark-input', className)}
        {...restProps}
      />
    );
  });

  return <Template />;
}, 'NumberInput');
