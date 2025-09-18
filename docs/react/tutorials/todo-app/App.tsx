import { useTableList } from '@anchorlib/react/storage';
import { type Todo, todoTable } from './todos';
import TodoForm from './TodoForm';
import TodoList from './TodoList';
import TodoStats from './TodoStats';
import { useRef } from 'react';
import { debugRender } from '@anchorlib/react';

export default function App() {
  const ref = useRef(null);
  debugRender(ref);

  const [todos] = useTableList<Todo, typeof todoTable>(todoTable);

  return (
    <div
      ref={ref}
      className="my-10 w-full max-w-md mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-10 flex flex-col items-center justify-center">
        <img src="https://beerush-id.github.io/anchor/docs/icon.svg" alt="Anchor Logo" className="mb-4 w-16" />
        <h1 className="text-3xl font-medium text-gray-800 dark:text-white">Todo App</h1>
      </div>
      <TodoForm todos={todos} />
      <TodoList todos={todos} />
      <TodoStats />
    </div>
  );
}
