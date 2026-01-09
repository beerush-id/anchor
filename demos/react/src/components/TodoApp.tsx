import { render, setup } from '@anchorlib/react';
import { todoTable } from '../utils/todos';
import TodoForm from './TodoForm';
import TodoList from './TodoList';

export default setup(() => {
  const todos = todoTable.list();

  return render(
    () => (
      <div className="mt-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-10 flex flex-col items-center justify-center">
          <img src="/images/anchor-logo.svg" alt="Anchor Logo" className="mb-4 w-16" />
          <h1 className="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
        </div>
        {todos.status === 'pending' ? (
          <span>Loading...</span>
        ) : todos.status === 'error' ? (
          <span>Error: {todos.error?.message}</span>
        ) : (
          <>
            <TodoForm todos={todos.data} />
            <TodoList todos={todos.data} />
          </>
        )}
      </div>
    ),
    'TodoApp'
  );
}, 'TodoApp');
