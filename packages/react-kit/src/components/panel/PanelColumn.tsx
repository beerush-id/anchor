import { type HTMLAttributes } from 'react';
import { resolveProps, useObserver } from '@anchorlib/react';
import type { ClassList, ClassName, EFC } from '@base/index.js';
import { classx } from '@utils/index.js';

export type PanelColumnProps = {
  label?: string;
  labelClassName?: ClassName | ClassList;
};

export const PanelColumn: EFC<HTMLAttributes<HTMLDivElement> & PanelColumnProps, HTMLDivElement> = (props) => {
  const { label, children, className, labelClassName, ...rest } = useObserver(() => resolveProps(props), [props]);

  return (
    <div className={classx('anchor-panel-column', className)} {...rest}>
      {label && <h4 className={classx('anchor-panel-column-label', labelClassName)}>{label}</h4>}
      {children}
    </div>
  );
};
