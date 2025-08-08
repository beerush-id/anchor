import React from 'react';

export const Button: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ disabled, children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-brand-purple ${className}`}>
    {children}
  </button>
);
