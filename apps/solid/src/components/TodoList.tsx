import { derived } from '@anchorlib/solid';
import type { TodoRecList } from '../utils/todos.js';
import TodoItem from './TodoItem.js';
import TodoStats from './TodoStats.js';

interface TodoListProps {
  todos: TodoRecList;
}

export default function TodoList({ todos }: TodoListProps) {
  const items = derived(() => todos.filter((todo) => !todo.deleted_at));

  return (
    <>
      <ul class="todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700">
        {items.value.length > 0 ? (
          items.value.map((todo) => <TodoItem todo={todo} />)
        ) : (
          <li class="p-4 text-center text-gray-500 dark:text-slate-400">
            No tasks yet. Add a new task to get started!
          </li>
        )}
      </ul>

      <TodoStats todos={todos} />
    </>
  );
}
