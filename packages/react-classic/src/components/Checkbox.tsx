import type { Bindable } from '../index.js';
import { debugRender, useValue } from '../index.js';
import type { WritableKeys } from '@anchorlib/core';
import type { InputProps } from './Types.js';
import { useRef } from 'react';

export function Checkbox<T extends Bindable, K extends WritableKeys<T>>({
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
      type="checkbox"
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
