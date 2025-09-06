import { type FC, type HTMLAttributes, useRef } from 'react';
import { debugRender } from '@anchor/react';

export const PanelRow: FC<HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  return (
    <div ref={ref} className={`panel-row flex gap-2 justify-between max-w-[230px] ${className}`} {...props}>
      {children}
    </div>
  );
};
