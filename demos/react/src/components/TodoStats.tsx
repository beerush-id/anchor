import { derived, render, setup } from '@anchorlib/react';
import type { TodoRec } from '../utils/todos';

interface TodoStatsProps {
  todos: TodoRec[];
}

export default setup<TodoStatsProps>(({ todos }) => {
  const stats = derived(() => {
    const available = todos.filter((todo) => !todo.deleted_at);

    return {
      total: available.length,
      active: available.filter((todo) => !todo.completed).length,
      completed: available.filter((todo) => todo.completed).length,
    };
  });

  return render(
    () => (
      <div className="todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="todo-stats-item flex flex-col items-center">
          <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
          <span className="todo-stats-value text-lg font-semibold dark:text-white">{stats.value.total}</span>
        </div>
        <div className="todo-stats-item flex flex-col items-center">
          <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Active</span>
          <span className="todo-stats-value text-lg font-semibold text-blue-600 dark:text-blue-400">
            {stats.value.active}
          </span>
        </div>
        <div className="todo-stats-item flex flex-col items-center">
          <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
          <span className="todo-stats-value text-lg font-semibold text-green-600 dark:text-green-400">
            {stats.value.completed}
          </span>
        </div>
      </div>
    ),
    'TodoStats'
  );
}, 'TodoStats');
