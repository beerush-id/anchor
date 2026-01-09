import { mutable, setup, snippet } from '@anchorlib/react';
import { type TodoRecList, todoTable } from '../utils/todos';

interface TodoFormProps {
  todos: TodoRecList;
}

export default setup<TodoFormProps>(({ todos }: TodoFormProps) => {
  const newText = mutable('');

  const handleAdd = () => {
    if (newText.value.trim() !== '') {
      const todo = todoTable.add({ text: newText.value, completed: false });
      todos.push(todo.data);
      newText.value = '';
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    handleAdd();
  };

  const TodoFormInput = snippet(
    () => (
      <input
        type="text"
        placeholder="Add a new task..."
        value={newText.value}
        onChange={(e) => (newText.value = e.target.value)}
        onKeyUp={handleEnter}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
    ),
    'TodoFormInput'
  );

  return (
    <div className="todo-form mb-6">
      <div className="flex gap-2">
        <TodoFormInput />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition duration-200 hover:bg-blue-700"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}, 'TodoForm');

function PlusIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" className={props.className}>
      <path
        fill="currentColor"
        d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"
      ></path>
    </svg>
  );
}
