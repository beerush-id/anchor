import { derived, setup, snippet } from '@anchorlib/react';
import type { TodoRecList } from '../utils/todos';
import TodoItem from './TodoItem';
import TodoStats from './TodoStats';

interface TodoListProps {
  todos: TodoRecList;
}

export default setup<TodoListProps>((props) => {
  const items = derived(() => props.todos.filter((todo) => !todo.deleted_at));

  const Snippet = snippet(
    () => (
      <ul className="todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700">
        {items.value.length > 0 ? (
          items.value.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : (
          <li className="p-4 text-center text-gray-500 dark:text-slate-400">
            No tasks yet. Add a new task to get started!
          </li>
        )}
      </ul>
    ),
    'TodoList'
  );

  return (
    <>
      <Snippet />
      <TodoStats todos={props.todos} />
    </>
  );
}, 'TodoList');
