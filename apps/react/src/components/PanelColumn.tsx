import { type FC, type HTMLAttributes, type ReactNode, useRef } from 'react';
import { debugRender } from '@anchorlib/react-classic';

export const PanelColumn: FC<HTMLAttributes<HTMLDivElement> & { label?: string; children: ReactNode }> = ({
  label,
  children,
  className,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  return (
    <div ref={ref} className={`panel-column flex flex-col gap-2 ${className}`} {...props}>
      {label && <h3 className="text-xs font-semibold text-slate-400">{label}</h3>}
      {children}
    </div>
  );
};
