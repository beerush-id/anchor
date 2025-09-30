import { type TodoRec, todoTable } from '../utils/todos.js';

interface TodoItemProps {
  todo: TodoRec;
}

export default function TodoItem({ todo }: TodoItemProps) {
  const handleRemove = (id: string) => {
    todoTable.remove(id);
  };

  return (
    <li class="todo-item flex items-center p-4 transition duration-150 hover:bg-gray-100 dark:hover:bg-slate-900">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => (todo.completed = e.target.checked)}
        class="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
      />
      <span
        class={`ml-3 flex-1 text-gray-700 dark:text-slate-200 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
        {todo.text}
      </span>
      <button
        onClick={() => handleRemove(todo.id)}
        class="ml-2 rounded px-2 py-1 text-red-600 opacity-80 transition duration-200 hover:opacity-100 dark:text-slate-300">
        <TrashIcon class="w-6" />
      </button>
    </li>
  );
}

function TrashIcon(props: { class?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" class={props.class}>
      <path
        fill="currentColor"
        d="M216,50H174V40a22,22,0,0,0-22-22H104A22,22,0,0,0,82,40V50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM94,40a10,10,0,0,1,10-10h48a10,10,0,0,1,10,10V50H94ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM110,104v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Zm48,0v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Z"></path>
    </svg>
  );
}
