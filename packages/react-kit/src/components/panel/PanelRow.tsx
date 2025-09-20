import { useRef } from 'react';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import type { RFC } from '@utils/types.js';
import { classx } from '@utils/index.js';

export const PanelRow: RFC<HTMLDivElement> = (props) => {
  const { ref, children, className, ...rest } = useObserver(() => resolveProps(props), [props]);
  const panelRowRef = useRef<HTMLDivElement>(null);
  debugRender(ref ?? panelRowRef);

  return (
    <div ref={ref ?? panelRowRef} className={classx('anchor-panel-row', className)} {...rest}>
      {children}
    </div>
  );
};
