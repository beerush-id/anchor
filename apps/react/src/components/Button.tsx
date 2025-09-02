import { type ButtonHTMLAttributes, type FC } from 'react';

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  disabled,
  children,
  onClick,
  className = '',
}) => (
  <button onClick={onClick} disabled={disabled} className={`anchor-btn ${className}`}>
    {children}
  </button>
);

export const IconButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  disabled,
  children,
  onClick,
  className = '',
}) => (
  <button onClick={onClick} disabled={disabled} className={`anchor-icon-btn ${className}`}>
    {children}
  </button>
);
