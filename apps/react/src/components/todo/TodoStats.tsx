import { type FC, useRef } from 'react';
import { todoApp } from '@lib/todo.js';
import { debugRender } from '@anchorlib/react';
import { observable } from '@anchorlib/react/components';

export const TodoStats: FC = observable(() => {
  const ref = useRef(null);
  debugRender(ref);

  const { total, active, completed } = todoApp.stats;

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
}, 'TodoStats');
