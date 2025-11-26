import type { Binding } from '@anchorlib/react-next';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'disabled'> & {
  disabled?: boolean | Binding<boolean>;
};

export type TextInputType = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';
export type TextInputProps = InputBaseProps & {
  type?: TextInputType;
  value: string | Binding<string>;
};

export type NumberInputType = 'number' | 'range';
export type NumberInputProps = InputBaseProps & {
  type?: NumberInputType;
  value: number | Binding<number>;
};

export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'disabled'> & {
  value: string | Binding<string>;
  disabled?: boolean | Binding<boolean>;
};
