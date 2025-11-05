import React, { useRef } from 'react';
import { debugRender } from '@anchorlib/react';

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef(null);
  debugRender(ref);

  return (
    <div
      ref={ref}
      className="p-2 pl-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2 md:gap-6 min-h-[54px]"
    >
      {children}
    </div>
  );
};
