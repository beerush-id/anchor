import React, { memo, useRef } from 'react';

import type { ITodoItem } from '../../lib/todo.js';
import { classicTodoStats, flashNode, useUpdateStat } from '../stats/stats.js';
import { Button } from '../Button.js';
import { Trash2 } from 'lucide-react';

export const ClassicTodoItem: React.FC<{
  todo: ITodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = memo(({ todo, onToggle, onRemove }) => {
  const ref = useRef(null);

  flashNode(ref.current);
  useUpdateStat(() => {
    classicTodoStats.item.value++;
  });

  const handleRemove = () => {
    onRemove(todo.id);
  };

  return (
    <li ref={ref} key={todo.id} className="flex items-center gap-2">
      <div className="flex items-center flex-1 gap-3 bg-slate-800/70 p-2 rounded-md">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
        />
        <span className={`${todo.completed ? 'line-through text-slate-500' : ''}`}>{todo.text}</span>
      </div>
      <Button onClick={() => handleRemove()} className="p-2 text-red-400 hover:bg-red-900/50">
        <Trash2 size={14} />
      </Button>
    </li>
  );
});
