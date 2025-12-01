import { classx } from '@anchorkit/headless/utils';
import { callback, setup, template } from '@anchorlib/react';
import type { ChangeEventHandler } from 'react';
import type { TextAreaProps } from './types.js';

export const TextArea = setup(function TextArea(props: TextAreaProps) {
  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    props.value = e.currentTarget.value ?? '';
    props.onChange?.(e);
  };

  const Template = template(() => {
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
  }, 'TextAreaElement');

  return <Template />;
}, 'TextArea');
