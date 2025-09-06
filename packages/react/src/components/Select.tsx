import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import type { SelectProps } from './Types.js';
import { useRef } from 'react';
import { debugRender } from '../dev.js';
import { useValue } from '../derive.js';

export function Select<T extends Bindable, K extends WritableKeys<T>>({
  ref,
  bind,
  name,
  value,
  onChange,
  ...props
}: SelectProps<T, K>) {
  const selfRef = useRef<HTMLSelectElement>(null);
  debugRender(ref ?? selfRef);

  const current = (useValue(bind, name) ?? value ?? '') as string;

  return (
    <select
      ref={ref ?? selfRef}
      name={name as string}
      value={current}
      onChange={(e) => {
        if (bind) {
          bind[name] = e.target.value as T[K];
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}
