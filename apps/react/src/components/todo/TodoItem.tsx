import React, { memo } from 'react';
import { useDerived } from '@anchor/react';
import type { TodoItemProp } from '../Types.js';
import { todoStats, useUpdateStat } from '../stats/stats.js';

export const TodoItem: React.FC<{ todo: TodoItemProp }> = memo(({ todo }) => {
  const [item] = useDerived(todo);

  useUpdateStat(() => {
    todoStats.item.value++;
  });
  console.log('Rendering todo item:', item.id);

  return (
    <li key={item.id} className="flex items-center gap-3 bg-slate-800/70 p-2 rounded-md">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => (item.completed = !item.completed)}
        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
      />
      <span className={`${item.completed ? 'line-through text-slate-500' : ''}`}>{item.text}</span>
    </li>
  );
});
