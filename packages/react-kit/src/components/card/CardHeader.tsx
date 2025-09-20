import { useRef } from 'react';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { classx } from '@utils/index.js';
import type { RFC } from '@utils/types.js';

export const CardHeader: RFC<HTMLDivElement> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props), [props]);
  const cardHeaderRef = useRef(null);

  debugRender(ref ?? cardHeaderRef);

  return (
    <div ref={ref ?? cardHeaderRef} className={classx('anchor-card-header', className)} {...rest}>
      {children}
    </div>
  );
};
