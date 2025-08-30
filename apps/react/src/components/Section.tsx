import type { FC, HTMLAttributes, ReactNode } from 'react';

export const Section: FC<{ children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...rests
}) => (
  <section className={`page-section py-5 md:py-16 w-full min-h-screen flex flex-col justify-center`} {...rests}>
    <div className={className}>{children}</div>
  </section>
);

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h2 className="text-3xl sm:text-5xl font-light uppercase text-center tracking-tight">
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-red">{children}</span>
  </h2>
);

export const SectionDescription: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`text-slate-300 ${className}`}>{children}</div>
);
