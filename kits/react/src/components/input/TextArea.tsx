import { bindable, setup, template } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextAreaProps } from './types.js';

export const TextArea = setup(function TextArea({ value = '', disabled = false, onChange, ...props }: TextAreaProps) {
  const valueRef = bindable('', value);
  const disabledRef = bindable(false, disabled);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    valueRef.value = e.currentTarget.value ?? '';
    onChange?.(e);
  };

  const Template = template(() => {
    return <textarea value={valueRef.value} disabled={disabledRef.value} onChange={handleChange} {...props} />;
  });

  return <Template />;
}, 'TextArea');
