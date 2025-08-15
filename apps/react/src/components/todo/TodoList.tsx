import { type FC, useRef } from 'react';
import { useDerivedContext } from '@anchor/react';
import { TodoItem } from './TodoItem.js';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { TodoContext } from '../../lib/todo.js';

export const TodoList: FC = () => {
  const ref = useRef(null);
  const [items, , snapshot] = useDerivedContext(TodoContext);

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.list.value++;
  });
  console.log('Rendering todo list:', snapshot);

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {items.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
};
