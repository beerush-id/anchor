import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden ${className}`}>{children}</div>
);
