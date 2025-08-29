import React, { useRef } from 'react';
import { flashNode } from '@lib/stats.js';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef(null);
  flashNode(ref.current);

  return (
    <div
      ref={ref}
      className={`bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col ${className}`}>
      {children}
    </div>
  );
};
