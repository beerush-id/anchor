import { type FC, useRef } from 'react';
import type { ITodoStats } from '@lib/todo.js';
import { debugRender } from '@anchorlib/react';

export const ClassicTodoStats: FC<{ stats: ITodoStats }> = ({ stats }) => {
  const ref = useRef(null);

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
};
