import { classx } from '@anchorkit/headless/utils';
import { type Bindable, callback, render, setup } from '@anchorlib/react';
import type { ChangeEventHandler, TextareaHTMLAttributes } from 'react';

export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'disabled'> & {
  value?: Bindable<string>;
  disabled?: boolean;
};

export const TextArea = setup<TextAreaProps>((props) => {
  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  return render<TextAreaProps>(
    ({ value = '', disabled, className }) => (
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
