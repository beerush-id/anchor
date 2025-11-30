import { mutable } from '@anchorlib/core';
import { setup, template } from '@anchorlib/react';
import type { FormEvent } from 'react';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
  deleted_at?: Date;
};

const DemoTodoApp = setup(() => {
  console.log('Creating states');
  const newText = mutable('');
  const todos = mutable<Todo[]>([
    {
      id: 1,
      text: 'Learn React',
      completed: false,
    },
    {
      id: 2,
      text: 'Learn Anchor',
      completed: false,
    },
    {
      id: 3,
      text: 'Learn TypeScript',
      completed: false,
    },
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (newText.value.trim() !== '') {
      // Add todo.
      todos.push({
        id: Date.now(),
        text: newText.value,
        completed: false,
      });

      // Reset input.
      newText.value = '';
    }
  };

  const TodoForm = template(() => (
    <div className="todo-form mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a new task..."
          value={newText.value}
          onChange={(e) => (newText.value = e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(e);
            }
          }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  ));

  const TodoList = template(() => (
    <ul className="todo-list divide-y divide-gray-200 rounded-lg bg-gray-50 dark:divide-slate-600 dark:bg-slate-700">
      {todos.length > 0 ? (
        todos.map((todo) => <TodoItem key={todo.id} todo={todo} todos={todos} />)
      ) : (
        <li className="p-4 text-center text-gray-500 dark:text-slate-400">
          No tasks yet. Add a new task to get started!
        </li>
      )}
    </ul>
  ));

  const TodoStats = template(() => (
    <div className="todo-stats mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Total</span>
        <span className="todo-stats-value text-lg font-semibold dark:text-white">{todos.length}</span>
      </div>
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Active</span>
        <span className="todo-stats-value text-lg font-semibold text-blue-600 dark:text-blue-400">
          {todos.filter((todo) => !todo.completed).length}
        </span>
      </div>
      <div className="todo-stats-item flex flex-col items-center">
        <span className="todo-stats-label text-sm text-gray-500 dark:text-slate-400">Completed</span>
        <span className="todo-stats-value text-lg font-semibold text-green-600 dark:text-green-400">
          {todos.filter((todo) => todo.completed).length}
        </span>
      </div>
    </div>
  ));

  console.log('Todo App rendered.');

  return (
    <div className={'px-4 w-full'}>
      <div className="mt-10 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
        <TodoForm />
        <TodoList />
        <TodoStats />
      </div>
    </div>
  );
});

const TodoItem = setup(({ todo, todos }: { todo: Todo; todos: Todo[] }) => {
  const handleToggle = (todo: Todo) => {
    todo.completed = !todo.completed;
  };

  const handleRemove = (todo: Todo) => {
    todos.splice(todos.indexOf(todo), 1);
  };

  const Template = template(() => (
    <>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => handleToggle(todo)}
        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
      />
      <span
        className={`ml-3 flex-1 text-gray-700 dark:text-slate-200 ${
          todo.completed ? 'line-through text-gray-400 opacity-50' : ''
        }`}
      >
        {todo.text}
      </span>
    </>
  ));

  return (
    <li
      key={todo.id}
      className="todo-item flex items-center p-4 transition duration-150 hover:bg-gray-100 dark:hover:bg-slate-900"
    >
      <Template />
      <button
        type="button"
        onClick={() => handleRemove(todo)}
        className="ml-2 rounded px-2 py-1 text-red-600 opacity-80 transition duration-200 hover:opacity-100 dark:text-slate-300"
      >
        <TrashIcon className="w-6" />
      </button>
    </li>
  );
});

export default DemoTodoApp;

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" className={className}>
    <path
      fill="currentColor"
      d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"
    ></path>
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" className={className}>
    <path
      fill="currentColor"
      d="M216,50H174V40a22,22,0,0,0-22-22H104A22,22,0,0,0,82,40V50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM94,40a10,10,0,0,1,10-10h48a10,10,0,0,1,10,10V50H94ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM110,104v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Zm48,0v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Z"
    ></path>
  </svg>
);
