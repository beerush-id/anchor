import { classx } from '@anchorkit/headless/utils';
import { callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextAreaProps } from './types.js';

export const TextArea = setup<TextAreaProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render(
    (_, { value = '', disabled, className }: TextAreaProps) => (
      <textarea
        value={value}
        disabled={disabled}
        onChange={callback(handleChange)}
        className={classx('ark-textarea', className)}
        {...props.$omit(['value', 'disabled', 'className', 'onChange'])}
      />
    ),
    'TextArea'
  );
}, 'TextArea');
