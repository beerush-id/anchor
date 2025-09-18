import { debugRender, useVariable } from '@anchorlib/react';
import { type FormEventHandler, useRef } from 'react';
import { observable } from '@anchorlib/react/view';
import { type Todo } from './todos';
import type { Row, RowListState } from '@anchorlib/storage/db';
import { todoActions } from './actions';

function TodoForm({ todos }: { todos: RowListState<Row<Todo>> }) {
  const ref = useRef(null);
  debugRender(ref);

  const [text] = useVariable('');

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    // Add the todo.
    todoActions.add(todos, text.value);

    // Reset the form input.
    text.value = '';
  };

  return (
    <form ref={ref} className="mb-6 flex gap-2" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add a new todo"
        value={text.value}
        onChange={(e) => (text.value = e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
      <button
        type="submit"
        disabled={!text.value}
        className="rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
        Add
      </button>
    </form>
  );
}

export default observable(TodoForm);
