import { type FC, useCallback, useMemo, useRef } from 'react';
import { ManualTodoItem } from './ManualTodoItem.js';
import { manualTodoStats, useUpdateStat } from '@lib/stats.js';
import { type ITodoItem } from '@lib/todo.js';
import { debugRender } from '@anchorlib/react';

export const ManualTodoList: FC<{
  todos: ITodoItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ todos, onToggle, onRemove }) => {
  const ref = useRef<HTMLUListElement>(null);

  debugRender(ref);
  useUpdateStat(() => {
    manualTodoStats.list.value++;
  });

  // Create stable callbacks for each item using useCallback and item ID
  const getItemToggleHandler = useCallback(
    (id: string) => {
      return () => onToggle(id);
    },
    [onToggle]
  );

  const getItemRemoveHandler = useCallback(
    (id: string) => {
      return () => onRemove(id);
    },
    [onRemove]
  );

  const todoItems = useMemo(() => {
    return todos.map((todo) => (
      <ManualTodoItem
        key={todo.id}
        todo={todo}
        onToggle={getItemToggleHandler(todo.id)}
        onRemove={getItemRemoveHandler(todo.id)}
      />
    ));
  }, [todos, getItemToggleHandler, getItemRemoveHandler]);

  if (!todos.length) {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">No todos yet.</p>;
  }

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {todoItems}
    </ul>
  );
};
