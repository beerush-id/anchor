import { type FC, useRef } from 'react';
import { type ITodoList } from '@lib/todo.js';
import { ClassicTodoItem } from './ClassicTodoItem.js';
import { classicTodoStats, flashNode, useUpdateStat } from '@lib/stats.js';

export const ClassicTodoList: FC<{
  todos: ITodoList;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ todos, onToggle, onRemove }) => {
  const ref = useRef(null);

  flashNode(ref.current);
  useUpdateStat(() => {
    classicTodoStats.list.value++;
  });

  if (!todos.length) {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">No todos yet.</p>;
  }

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {todos.map((todo) => (
        <ClassicTodoItem key={todo.id} todo={todo} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </ul>
  );
};
