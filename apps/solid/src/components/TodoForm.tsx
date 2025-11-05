import { type TodoRecList, todoTable } from '../utils/todos.js';
import { variableRef } from '@anchorlib/solid';
import { type JSX } from 'solid-js';

interface TodoFormProps {
  todos: TodoRecList;
}

export default function TodoForm({ todos }: TodoFormProps) {
  const newText = variableRef('');

  const handleAdd = () => {
    if (newText.value.trim() !== '') {
      const todo = todoTable.add({ text: newText.value, completed: false });
      todos.push(todo.data);
      newText.value = '';
    }
  };

  const handleEnter: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (e.key !== 'Enter') return;
    handleAdd();
  };

  return (
    <div class="todo-form mb-6">
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="Add a new task..."
          value={newText.value}
          onInput={(e) => (newText.value = e.target.value)}
          onKeyUp={handleEnter}
          class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <button
          onClick={handleAdd}
          class="rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

function PlusIcon(props: { class?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" class={props.class}>
      <path
        fill="currentColor"
        d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"
      ></path>
    </svg>
  );
}
