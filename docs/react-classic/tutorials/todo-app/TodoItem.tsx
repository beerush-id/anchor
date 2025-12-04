import { memo, useRef } from 'react';
import { type TodoRec } from './todos';
import { debugRender, useObservedRef, type VariableRef, view } from '@anchorlib/react';
import { todoActions } from './actions';
import { getContext } from '@anchorlib/core';

// Create a component that renders a single todo. This component is rendered once for each todo.
function TodoItem({ todo }: { todo: TodoRec }) {
  const itemRef = useRef(null);

  const handleToggle = () => {
    // Call the action to toggle the todo.
    todoActions.toggle(todo);
  };

  const handleDelete = () => {
    // Call the action to delete the todo.
    todoActions.remove(todo);
  };

  // Create a view for the todo item, since only these elements that need to be re-rendered.
  const TodoItemView = view(() => {
    return (
      <div className="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          checked={todo.completed}
          className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
          onChange={handleToggle}
        />
        <input
          type="text"
          value={todo.text}
          onChange={(e) => (todo.text = e.target.value)}
          className={`ml-3 flex-1 text-gray-700 dark:text-slate-200 outline-none ${todo.completed ? 'line-through' : ''}`}
        />
      </div>
    );
  });

  // Get the search variable from the global context.
  const search = getContext('search') as VariableRef<string>;

  // Observe the search variable to know when to hide the todo item.
  const shouldHide = useObservedRef(() => {
    // Make sure to check if the search variable is defined and have a value.
    if (!search?.value) return false;

    // Mark the todo as hidden if there is an active search and the todo is not matching the search query.
    return !todo.text.toLowerCase().includes(search.value.toLowerCase());
  });

  // This prevents the TodoList component to re-render.
  const TodoItemBody = view(() => {
    // Remove itself if the hidden variable is true.
    // This only re-renders when the hidden variable changes.
    if (shouldHide.value) return;

    // Remove itself if the todo is deleted.
    if (todo.deleted_at) return;

    debugRender(itemRef);

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
