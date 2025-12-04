import { todoStats } from './todos';
import { useRef } from 'react';
import { debugRender, observer } from '@anchorlib/react';

// We don't need selective rendering here because the component is small.
function TodoStats() {
  const ref = useRef(null);
  debugRender(ref);

  const stats = todoStats.data;

  return (
    <div
      ref={ref}
      className="todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
        <span className="todo-stats-value text-lg font-semibold dark:text-white">{stats.total}</span>
      </div>
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
        <span className="todo-stats-value text-lg font-semibold dark:text-white">{stats.completed}</span>
      </div>
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Pending</span>
        <span className="todo-stats-value text-lg font-semibold dark:text-white">{stats.pending}</span>
      </div>
    </div>
  );
}

export default observer(TodoStats);
