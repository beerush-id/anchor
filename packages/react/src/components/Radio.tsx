import type { Bindable } from '@base/index.js';
import { debugRender, useValue } from '@base/index.js';
import type { WritableKeys } from '@anchor/core';
import type { InputProps } from './Types.js';
import { useRef } from 'react';

export function Radio<T extends Bindable, K extends WritableKeys<T>>({
  ref,
  bind,
  name,
  checked,
  onChange,
  ...props
}: InputProps<T, K>) {
  const selfRef = useRef<HTMLInputElement>(null);
  debugRender(ref ?? selfRef);

  const current = (useValue(bind, name) ?? checked ?? false) as boolean;

  return (
    <input
      ref={ref ?? selfRef}
      type="radio"
      name={name as string}
      checked={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.checked as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}
