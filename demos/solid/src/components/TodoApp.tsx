import { todoTable } from '../utils/todos.js';
import TodoForm from './TodoForm.js';
import TodoList from './TodoList.js';

export default function TodoApp() {
  const todos = todoTable.list();

  return (
    <div class="mt-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
      <div class="mb-10 flex flex-col items-center justify-center">
        <img src="/images/anchor-logo.svg" alt="Anchor Logo" class="mb-4 w-16" />
        <h1 class="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
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
  );
}
