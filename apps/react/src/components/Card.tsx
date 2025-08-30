import React, { useRef } from 'react';
import { flashNode } from '@lib/stats.js';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef(null);
  flashNode(ref.current);

  return (
    <div ref={ref} className={`card overflow-hidden flex flex-col ${className}`}>
      {children}
    </div>
  );
};
