import { type FC, memo, useRef } from 'react';
import type { ITodoStats } from '@lib/todo.js';
import { debugRender } from '@anchorlib/react';

export const ManualTodoStats: FC<{ stats: ITodoStats }> = memo(
  ({ stats }) => {
    const ref = useRef<HTMLDivElement>(null);

    debugRender(ref);

    return (
      <div ref={ref} className="flex items-center justify-between px-10 pb-4">
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-slate-400">{stats.total}</span>
          <span className="text-xs text-gray-500">Total</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-blue-600">{stats.active}</span>
          <span className="text-xs text-gray-500">Active</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-green-600">{stats.completed}</span>
          <span className="text-xs text-gray-500">Completed</span>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if stats actually changed
    return (
      prevProps.stats.total === nextProps.stats.total &&
      prevProps.stats.active === nextProps.stats.active &&
      prevProps.stats.completed === nextProps.stats.completed
    );
  }
);
