import React from 'react';

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center">{children}</div>
);
