import { type ButtonHTMLAttributes, useRef } from 'react';
import type { RFC } from '@utils/types.js';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { classx } from '@utils/index.js';

export const Button: RFC<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props), [props]);
  const buttonRef = useRef(null);
  debugRender(ref ?? buttonRef);

  return (
    <button ref={ref ?? buttonRef} className={classx('anchor-button', className)} {...rest}>
      {children}
    </button>
  );
};

export const IconButton: RFC<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props), [props]);
  const buttonRef = useRef(null);
  debugRender(buttonRef);

  return (
    <button ref={ref ?? buttonRef} className={classx('anchor-icon-button', className)} {...rest}>
      {children}
    </button>
  );
};
