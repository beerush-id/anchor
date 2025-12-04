import { type Todo } from './todos';
import TodoItem from './TodoItem';
import type { Row, RowListState } from '@anchorlib/storage/db';
import { useRef } from 'react';
import { debugRender, useObserver } from '@anchorlib/react';

// This component is expected to re-render when todo list changes,
// as its purpose is to only render todo items.
function TodoList({ todos }: { todos: RowListState<Row<Todo>> }) {
  const ref = useRef(null);
  debugRender(ref);

  // Observe the status and total count of todos since only those data that relevant
  // for rendering the list.
  const [status] = useObserver(() => [todos.status, todos.data.length]);

  if (status === 'pending') {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">Loading...</p>;
  }

  return (
    <ul
      ref={ref}
      className="todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700">
      {todos.data.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

export default TodoList;
