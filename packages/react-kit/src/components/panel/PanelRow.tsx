import { type HTMLAttributes } from 'react';
import { resolveProps, useObserver } from '@anchorlib/react';
import type { EFC } from '@base/index.js';
import { classx } from '@utils/index.js';

export const PanelRow: EFC<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = (props) => {
  const { children, className, ...rest } = useObserver(() => resolveProps(props), [props]);

  return (
    <div className={classx('anchor-panel-row', className)} {...rest}>
      {children}
    </div>
  );
};
