import React, { memo, useRef } from 'react';

import type { ITodoItem } from '../../lib/todo.js';
import { classicTodoStats, flashNode, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoItem: React.FC<{ todo: ITodoItem; onToggle: (id: number) => void }> = memo(
  ({ todo, onToggle }) => {
    const ref = useRef(null);

    flashNode(ref.current);
    useUpdateStat(() => {
      classicTodoStats.item.value++;
    });
    console.log('Rendering classic todo item:', todo);

    return (
      <li ref={ref} key={todo.id} className="flex items-center gap-3 bg-slate-800/70 p-2 rounded-md">
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
