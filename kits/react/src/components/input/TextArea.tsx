import { classx } from '@anchorkit/headless/utils';
import { callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextAreaProps } from './types.js';

export const TextArea = setup(function TextArea(props: TextAreaProps) {
  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render(() => {
    const { value = '', onChange: _onChange, disabled, className, ...restProps } = props;

    return (
      <textarea
        value={value}
        disabled={disabled}
        onChange={callback(handleChange)}
        className={classx('ark-textarea', className)}
        {...restProps}
      />
    );
  }, 'TextArea');
}, 'TextArea');
