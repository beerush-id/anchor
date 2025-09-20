import { useRef } from 'react';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import type { RFC } from '@utils/types.js';
import { classx } from '@utils/index.js';

export const Card: RFC<HTMLDivElement> = (props) => {
  const { ref, className, children, ...rest } = useObserver(() => resolveProps(props), [props]);
  const cardRef = useRef(null);
  debugRender(ref ?? cardRef);

  return (
    <div ref={ref ?? cardRef} className={classx('anchor-card', className)} {...rest}>
      {children}
    </div>
  );
};
