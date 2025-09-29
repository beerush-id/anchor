import { type FC, useRef } from 'react';
import { debugRender } from '@anchorlib/react';

import { type ITodoList } from '@utils/todo';
import { classicTodoStats, useUpdateStat } from '@utils/stats';
import { ClassicTodoItem } from './ClassicTodoItem';

export const ClassicTodoList: FC<{
  todos: ITodoList;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
}> = ({ todos, onToggle, onRemove, onTextChange }) => {
  const ref = useRef(null);

  debugRender(ref);
  useUpdateStat(() => {
    classicTodoStats.list.value++;
  });

  if (!todos.length) {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">No todos yet.</p>;
  }

  return (
    <ul ref={ref} className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
      {todos.map((todo) => (
        <ClassicTodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRemove={onRemove}
          onTextChange={onTextChange}
        />
      ))}
    </ul>
  );
};
