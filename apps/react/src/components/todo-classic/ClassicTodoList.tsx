import { type FC, useRef } from 'react';
import { type ITodoList } from '../../lib/todo.js';
import { ClassicTodoItem } from './ClassicTodoItem.js';
import { classicTodoStats, flashNode, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoList: FC<{ todos: ITodoList; onToggle: (id: number) => void }> = ({ todos, onToggle }) => {
  const ref = useRef(null);

  flashNode(ref.current);
  useUpdateStat(() => {
    classicTodoStats.list.value++;
  });
  console.log('Rendering classic todo list:', todos);

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {todos.map((todo) => (
        <ClassicTodoItem key={todo.id} todo={todo} onToggle={onToggle} />
      ))}
    </ul>
  );
};
