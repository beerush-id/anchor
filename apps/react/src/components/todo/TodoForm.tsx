import React, { memo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../Button.js';
import type { TodoItemProp } from '../Types.js';
import { todoStats, useUpdateStat } from '../stats/stats.js';

export const TodoForm: React.FC<{ todos: TodoItemProp[] }> = memo(({ todos }) => {
  const [newText, setNewText] = useState('');

  const addTodo = () => {
    todos.push({
      id: Date.now(),
      text: newText,
      completed: false,
    });

    setNewText('');
  };

  useUpdateStat(() => {
    todoStats.form.value++;
  });
  console.log('Rendering todo form');
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-orange"
      />
      <Button disabled={!newText} onClick={addTodo}>
        <Plus size={16} />
      </Button>
    </div>
  );
});
