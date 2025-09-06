import { type InputProps } from './Input.js';
import type { Bindable } from '../types.js';
import type { WritableKeys } from '@anchor/core';
import { useValue } from '../derive.js';
import { useMemo, useRef } from 'react';
import { debugRender } from '../dev.js';

export function ColorPicker<T extends Bindable, K extends WritableKeys<T>>({
  bind,
  name,
  value,
  inherits,
  onChange,
  children,
  className,
  placeholder,
  ...props
}: InputProps<T, K>) {
  const ref = useRef<HTMLLabelElement>(null);
  debugRender(ref);

  const inheritedPlaceholder: string | undefined = useMemo(() => {
    if (!Array.isArray(inherits) || !inherits.length) return undefined;

    for (const ref of inherits) {
      const refValue = ref?.[name as never];
      if (refValue !== undefined) return refValue as string;
    }
  }, [bind, name, value]);
  const current = (useValue(bind, name) ?? value ?? inheritedPlaceholder ?? placeholder ?? '#000000') as string;

  return (
    <label ref={ref} className={className} style={{ backgroundColor: current }}>
      <input
        type={'color'}
        className="sr-only"
        name={name as string}
        value={current}
        onChange={(e) => {
          if (bind) {
            bind[name] = e.target.value as never;
          }

          onChange?.(e);
        }}
        {...props}
      />
      {children}
    </label>
  );
}
