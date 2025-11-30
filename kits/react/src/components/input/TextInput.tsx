import { classx } from '@anchorkit/headless/utils';
import { bindable, callback, setup, template } from '@anchorlib/react';
import type { TextInputProps } from './types.js';

export const TextInput = setup((props: TextInputProps) => {
  const valueRef = bindable('', props, 'value');

  const Template = template(() => {
    const { value: _value, onChange, disabled, className, ...restProps } = props;

    return (
      <input
        value={valueRef.value}
        disabled={disabled}
        className={classx('ark-input', className)}
        onChange={callback((e) => {
          valueRef.value = e.currentTarget.value;
          onChange?.(e);
        })}
        {...restProps}
      />
    );
  }, 'TextInput');

  return <Template />;
}, 'TextInput');
