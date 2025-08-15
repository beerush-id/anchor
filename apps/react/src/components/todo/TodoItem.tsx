import { type FC, memo, useRef } from 'react';
import { useDerived } from '@anchor/react';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { type ITodoItem } from '../../lib/todo.js';
import { anchor } from '@anchor/core';

export const TodoItem: FC<{ todo: ITodoItem }> = memo(({ todo }) => {
  const ref = useRef(null);
  const [item, , snapshot] = useDerived(todo);
  const writable = anchor.writable(item);
  console.log(writable);

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.item.value++;
  });
  console.log('Rendering todo item:', snapshot);

  return (
    <li ref={ref} key={item.id} className="flex items-center gap-3 bg-slate-800/70 p-2 rounded-md">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => (writable.completed = !writable.completed)}
        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
      />
      <span className={`${item.completed ? 'line-through text-slate-500' : ''}`}>{item.text}</span>
    </li>
  );
});
