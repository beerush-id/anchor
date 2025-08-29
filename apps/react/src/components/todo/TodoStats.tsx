import { type FC, useRef } from 'react';
import type { ITodoStats } from '@lib/todo.js';
import { useDerived } from '@anchor/react';
import { flashNode } from '@lib/stats.js';

export const TodoStats: FC<{ stats: ITodoStats }> = ({ stats }) => {
  const ref = useRef(null);
  const [total, active, completed] = useDerived(() => [stats.total, stats.active, stats.completed], [stats]);

  flashNode(ref.current);

  return (
    <div ref={ref} className="flex items-center justify-between px-10 pb-4">
      <div className="flex flex-col items-center">
        <span className="text-lg font-semibold text-slate-400">{total}</span>
        <span className="text-xs text-gray-500">Total</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-semibold text-blue-600">{active}</span>
        <span className="text-xs text-gray-500">Active</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-semibold text-green-600">{completed}</span>
        <span className="text-xs text-gray-500">Completed</span>
      </div>
    </div>
  );
};
