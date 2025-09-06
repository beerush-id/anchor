import { type InputHTMLAttributes, useRef } from 'react';
import { observed } from '@anchor/react/components';
import { debugRender } from '@anchor/react';

export type InputProps<T extends Record<string, string>> = {
  bindTo: T;
  name: keyof T;
} & InputHTMLAttributes<HTMLInputElement>;

function InputComp<T extends Record<string, string>>({ bindTo, name, className, ...props }: InputProps<T>) {
  const ref = useRef(null);
  debugRender(ref);

  return (
    <input
      ref={ref}
      className={`anchor-input ${className}`}
      name={name}
      value={bindTo[name]}
      onChange={(e) => {
        bindTo[name] = e.target.value as never;
      }}
      {...props}
    />
  );
}

export const Input = observed(InputComp, 'Input');
