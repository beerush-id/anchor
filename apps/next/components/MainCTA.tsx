'use client';

import { BookText, Gauge } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useScrollNav } from '@anchorlib/react-kit/actions';

export const MainCTA: FC<{ className?: string; tiys?: boolean; children?: ReactNode; href?: string }> = ({
  className,
  tiys = true,
  children,
  href = '/docs/getting-started',
}) => {
  const tryItRef = useScrollNav<HTMLAnchorElement>();

  return (
    <>
      <div className={`max-w-6xl mx-auto flex items-center justify-center gap-4 md:gap-8 ${className}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="h-[54px] md:self-end inline-flex flex-none items-center px-6 py-3 bg-brand-main hover:bg-brand-main-hover text-white transition-colors rounded-md font-medium btn-primary">
          <BookText className="w-5 h-5 mr-2" />
          Get Started
        </a>
        {tiys && (
          <a
            ref={tryItRef}
            href="#todo-benchmark"
            className="h-[54px] flex whitespace-nowrap items-center px-6 py-3 bg-slate-900 hover:bg-brand-main-hover text-slate-200 rounded-md font-medium btn-secondary transition-colors">
            <Gauge className="w-5 h-5 mr-2" />
            Try It Yourself
          </a>
        )}
        {children}
      </div>
    </>
  );
};
