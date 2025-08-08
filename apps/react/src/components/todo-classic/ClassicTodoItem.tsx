import React, { memo } from 'react';

import type { TodoItemProp } from '../Types.js';
import { classicTodoStats, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoItem: React.FC<{ todo: TodoItemProp; onToggle: (id: number) => void }> = memo(
  ({ todo, onToggle }) => {
    useUpdateStat(() => {
      classicTodoStats.item.value++;
    });
    console.log('Rendering classic todo item', todo.id);

    return (
      <li key={todo.id} className="flex items-center gap-3 bg-slate-800/70 p-2 rounded-md">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
        />
        <span className={`${todo.completed ? 'line-through text-slate-500' : ''}`}>{todo.text}</span>
      </li>
    );
  }
);
