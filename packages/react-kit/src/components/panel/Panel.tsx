import type { ClassList, ClassName } from '@base/index.js';
import { type HTMLAttributes } from 'react';
import { classx } from '@utils/index.js';
import { optimized } from '@view/Optimized.js';

export type PanelProps = {
  label?: string;
  labelClassName?: ClassName | ClassList;
};

export type PanelCollapsibleProps = PanelProps & {
  collapsible?: boolean;
  open?: boolean;
};

export const Panel = optimized<HTMLAttributes<HTMLDivElement | HTMLDetailsElement> & PanelCollapsibleProps>(
  ({ label, labelClassName, className, collapsible, open, children, ...rest }) => {
    if (collapsible) {
      return (
        <details
          open={open}
          className={classx('anchor-panel', 'anchor-panel-collapsible', { 'anchor-panel-open': open }, className)}
          {...(rest as HTMLAttributes<HTMLDetailsElement>)}>
          <summary className={classx('anchor-panel-label', labelClassName)}>{label}</summary>
          {children}
        </details>
      );
    }

    return (
      <div className={classx('anchor-panel', className)} {...(rest as HTMLAttributes<HTMLDivElement>)}>
        {label && <h3 className={classx('anchor-panel-label', labelClassName)}>{label}</h3>}
        {children}
      </div>
    );
  },
  'Panel'
);
