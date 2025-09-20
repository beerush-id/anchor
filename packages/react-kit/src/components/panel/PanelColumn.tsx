import { type HTMLAttributes, useRef } from 'react';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import type { ClassList, ClassName, RFC } from '@utils/types.js';
import { classx } from '@utils/index.js';

export type PanelColumnProps = {
  label?: string;
  labelClassName?: ClassName | ClassList;
};

export const PanelColumn: RFC<HTMLDivElement, HTMLAttributes<HTMLDivElement> & PanelColumnProps> = (props) => {
  const { ref, label, children, className, labelClassName, ...rest } = useObserver(() => resolveProps(props), [props]);
  const panelColumnRef = useRef(null);
  debugRender(ref ?? panelColumnRef);

  return (
    <div ref={ref ?? panelColumnRef} className={classx('anchor-panel-column', className)} {...rest}>
      {label && <h4 className={classx('anchor-panel-column-label', labelClassName)}>{label}</h4>}
      {children}
    </div>
  );
};
