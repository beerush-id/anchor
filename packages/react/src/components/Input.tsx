import { useMemo, useRef } from 'react';
import type { Bindable } from '../types.js';
import { useValue } from '../derive.js';
import type { WritableKeys } from '@anchor/core';
import { debugRender } from '../dev.js';
import type { InputProps } from './Types.js';

export function Input<T extends Bindable, K extends WritableKeys<T>>({
  ref,
  bind,
  name,
  pipe,
  value,
  inherits,
  onChange,
  placeholder,
  ...props
}: InputProps<T, K>) {
  const selfRef = useRef<HTMLInputElement>(null);
  debugRender(ref ?? selfRef);

  const inheritedPlaceholder: string | undefined = useMemo(() => {
    if (!Array.isArray(inherits) || !inherits.length) return undefined;

    for (const ref of inherits) {
      const refValue = ref?.[name as never];
      if (refValue !== undefined) return refValue as string;
    }
  }, [bind, name, value]);
  const current = (useValue(bind, name) ?? value ?? '') as string;

  return (
    <input
      ref={ref ?? selfRef}
      name={name as string}
      value={current}
      placeholder={inheritedPlaceholder ?? placeholder}
      onChange={(e) => {
        if (bind) {
          let value: string | number | undefined = e.target.value;

          if (props.type === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) value = undefined;
          }

          if (typeof value === 'undefined') {
            delete bind[name];
          } else {
            bind[name] = value as T[K];
          }

          if (pipe) {
            pipe[name] = bind[name];
          }
        }

        onChange?.(e);
      }}
      {...props}
    />
  );
}
