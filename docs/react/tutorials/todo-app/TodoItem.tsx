import { memo, useRef } from 'react';
import { observe } from '@anchorlib/react/view';
import { type TodoRec } from './todos';
import { debugRender } from '@anchorlib/react';
import { todoActions } from './actions';

// Create a component that renders a single todo. This component is rendered once for each todo.
function TodoItem({ todo }: { todo: TodoRec }) {
  const itemRef = useRef(null);
  debugRender(itemRef);

  const handleToggle = () => {
    // Call the action to toggle the todo.
    todoActions.toggle(todo);
  };

  const handleDelete = () => {
    // Call the action to delete the todo.
    todoActions.remove(todo);
  };

  // Create a view for the todo item, since only these elements that need to be re-rendered.
  const TodoItemView = observe<HTMLDivElement>((ref) => {
    return (
      <div ref={ref} className="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          checked={todo.completed}
          className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
          onChange={handleToggle}
        />
        <span className={`ml-3 flex-1 text-gray-700 dark:text-slate-200 ${todo.completed ? 'line-through' : ''}`}>
          {todo.text}
        </span>
      </div>
    );
  });

  // Only re-render when the deleted status change.
  // This prevents the TodoList component to re-render when a todo is deleted.
  const TodoItemBody = observe<HTMLLIElement>(() => {
    if (todo.deleted_at) return;

    return (
      <li
        ref={itemRef}
        className="flex items-center p-4 gap-4 transition duration-150 hover:bg-gray-100 dark:hover:bg-slate-900">
        <TodoItemView />
        <button
          className="ml-2 rounded px-2 py-1 text-xs text-red-600 opacity-80 transition duration-200 hover:opacity-100 dark:text-slate-300 uppercase"
          onClick={handleDelete}>
          Delete
        </button>
      </li>
    );
  });

  return <TodoItemBody />;
}

// Memoize the component to prevent unnecessary re-renders.
export default memo(TodoItem);
