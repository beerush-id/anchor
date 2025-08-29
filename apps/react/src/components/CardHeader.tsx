import React, { useRef } from 'react';
import { flashNode } from '@lib/stats.js';

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef(null);
  flashNode(ref.current);

  return (
    <div ref={ref} className="p-2 pl-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center">
      {children}
    </div>
  );
};
