import { derived } from '@anchorlib/solid';
import type { TodoRec } from '../utils/todos.js';

interface TodoStatsProps {
  todos: TodoRec[];
}

export default function TodoStats({ todos }: TodoStatsProps) {
  const stats = derived(() => {
    const available = todos.filter((todo) => !todo.deleted_at);

    return {
      total: available.length,
      active: available.filter((todo) => !todo.completed).length,
      completed: available.filter((todo) => todo.completed).length,
    };
  });

  return (
    <div class="todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
        <span class="todo-stats-value text-lg font-semibold dark:text-white">{stats.value.total}</span>
      </div>
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Active</span>
        <span class="todo-stats-value text-lg font-semibold text-blue-600 dark:text-blue-400">
          {stats.value.active}
        </span>
      </div>
      <div class="todo-stats-item flex flex-col items-center">
        <span class="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
        <span class="todo-stats-value text-lg font-semibold text-green-600 dark:text-green-400">
          {stats.value.completed}
        </span>
      </div>
    </div>
  );
}
