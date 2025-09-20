import type { ClassList, ClassName, RFC } from '@utils/types.js';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { type HTMLAttributes, type RefObject, useRef } from 'react';
import { classx } from '@utils/index.js';

export type PanelProps = {
  label?: string;
  labelClassName?: ClassName | ClassList;
};

export type PanelCollapsibleProps = PanelProps & {
  collapsible?: boolean;
  open?: boolean;
};

export const Panel: RFC<
  HTMLDivElement | HTMLDetailsElement,
  HTMLAttributes<HTMLDivElement | HTMLDetailsElement> & PanelCollapsibleProps
> = (props) => {
  const { ref, label, className, labelClassName, collapsible, children, open, ...rest } = useObserver(
    () => resolveProps(props),
    [props]
  );
  const panelRef = useRef<HTMLDivElement | HTMLDetailsElement>(null);
  debugRender(ref ?? panelRef);

  if (collapsible) {
    return (
      <details
        ref={(ref ?? panelRef) as RefObject<HTMLDetailsElement>}
        open={open}
        className={classx('anchor-panel', 'anchor-panel-collapsible', { 'anchor-panel-open': open }, className)}
        {...rest}>
        <summary className={classx('anchor-panel-label', labelClassName)}>{label}</summary>
        {children}
      </details>
    );
  }

  return (
    <div ref={(ref ?? panelRef) as RefObject<HTMLDivElement>} className={classx('anchor-panel', className)} {...rest}>
      {label && <h3 className={classx('anchor-panel-label', labelClassName)}>{label}</h3>}
      {children}
    </div>
  );
};
