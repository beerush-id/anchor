import { debugRender, useValueIs } from '@base/index.js';
import { type HTMLAttributes, type MouseEventHandler, useMemo, useRef } from 'react';
import type { WritableKeys } from '@anchorlib/core';
import type { ToggleProps } from './Types.js';

export function Toggle<T, K extends WritableKeys<T>>({
  bind,
  name,
  value,
  children,
  inherits,
  onChange,
  onClick,
  ref,
  ...props
}: ToggleProps<T, K>) {
  const selfRef = useRef<HTMLButtonElement>(null);
  debugRender(ref ?? selfRef);

  const checked = useValueIs(bind as never, name, value ?? true);
  const partial = useMemo(() => {
    if (!Array.isArray(inherits) || !inherits.length) return false;

    for (const ref of inherits) {
      if (ref?.[name] === (value ?? true)) {
        return true;
      }
    }

    return false;
  }, [bind, name, value]);

  const handleToggle: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (checked) {
      if (value) {
        delete bind[name];
      } else {
        bind[name] = false as never;
      }
    } else {
      if (value) {
        bind[name] = value as never;
      } else {
        bind[name] = true as never;
      }
    }

    onClick?.(e);
    onChange?.(bind[name]);
  };

  return (
    <button
      ref={ref ?? selfRef}
      disabled={!bind}
      data-checked={checked}
      data-partial={partial}
      onClick={handleToggle}
      {...props}>
      {children}
    </button>
  );
}

export function ToggleGroup({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ark-toggle-group ${className}`}>{children}</div>;
}
