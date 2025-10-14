import { useTableList } from '@anchorlib/react/storage';
import { type Todo, todoTable } from './todos';
import TodoForm from './TodoForm';
import TodoList from './TodoList';
import TodoStats from './TodoStats';
import { useRef } from 'react';
import { debugRender, useVariable, view } from '@anchorlib/react';
import { setContext } from '@anchorlib/core';

export default function App() {
  const ref = useRef(null);
  debugRender(ref);

  const [todos] = useTableList<Todo, typeof todoTable>(todoTable);
  const [search] = useVariable('');

  // Register the search variable to the global context.
  setContext('search', search);

  // Create a view for the search input. Only re-rendered when the search value changes.
  const Search = view(() => {
    return (
      <input
        type="text"
        placeholder="Search..."
        value={search.value}
        onChange={(e) => (search.value = e.target.value)}
        className="w-full mb-6 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
    );
  });

  return (
    <div
      ref={ref}
      className="my-10 w-full max-w-md mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-10 flex flex-col items-center justify-center">
        <img src="https://anchorlib.dev/docs/icon.svg" alt="Anchor Logo" className="mb-4 w-16" />
        <h1 className="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
      </div>
      <Search />
      <TodoList todos={todos} />
      <TodoForm todos={todos} />
      <TodoStats />
    </div>
  );
}
