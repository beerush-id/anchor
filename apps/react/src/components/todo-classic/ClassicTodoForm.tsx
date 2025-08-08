import { Button } from '../Button.js';
import { Plus } from 'lucide-react';
import React, { memo, useState } from 'react';
import type { TodoItemProp } from '../Types.js';
import { classicTodoStats, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoForm: React.FC<{ onAdd: (todo: TodoItemProp) => void }> = memo(({ onAdd }) => {
  const [newTodoText, setNewTodoText] = useState('');

  const addTodo = () => {
    onAdd({
      id: Math.random(),
      text: newTodoText,
      completed: false,
    });

    setNewTodoText('');
  };

  useUpdateStat(() => {
    classicTodoStats.form.value++;
  });
  console.log('Rendering classic todo form');

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-purple"
      />
      <Button onClick={addTodo} disabled={!newTodoText}>
        <Plus size={16} />
      </Button>
    </div>
  );
});
