import { type FC, type ReactNode, useRef } from 'react';
import { debugRender } from '@anchor/react';

export const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef(null);
  debugRender(ref.current);

  return (
    <div ref={ref} className={`card flex flex-col ${className}`}>
      {children}
    </div>
  );
};
