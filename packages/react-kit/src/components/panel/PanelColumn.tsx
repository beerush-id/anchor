import { type HTMLAttributes } from 'react';
import { resolveProps, useObserver } from '@anchorlib/react';
import type { ClassList, ClassName, EFC } from '@base/index.js';
import { classx } from '@utils/index.js';

export type PanelColumnProps = {
  label?: string;
  labelClassName?: ClassName | ClassList;
};

const { brand } = classx;

export const PanelColumn: EFC<HTMLAttributes<HTMLDivElement> & PanelColumnProps, HTMLDivElement> = (props) => {
  const { label, children, className, labelClassName, ...rest } = useObserver(() => resolveProps(props), [props]);

  return (
    <div className={classx(brand('panel-col'), className)} {...rest}>
      {label && <h4 className={classx(brand('panel-col-label'), labelClassName)}>{label}</h4>}
      {children}
    </div>
  );
};
