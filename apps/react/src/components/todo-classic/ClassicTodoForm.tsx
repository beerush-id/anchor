import { Button } from '../Button.js';
import { Plus } from 'lucide-react';
import { type FC, useRef, useState } from 'react';
import { type ITodoItem } from '../../lib/todo.js';
import { classicTodoStats, flashNode, useUpdateStat } from '../stats/stats.js';
import { shortId } from '@anchor/core';

export const ClassicTodoForm: FC<{ onAdd: (todo: ITodoItem) => void }> = ({ onAdd }) => {
  const ref = useRef(null);
  const [newTodoText, setNewTodoText] = useState('');

  const addTodo = () => {
    onAdd({
      id: shortId(),
      text: newTodoText,
      completed: false,
    });

    setNewTodoText('');
  };

  flashNode(ref.current);
  useUpdateStat(() => {
    classicTodoStats.form.value++;
  });

  return (
    <div ref={ref} className="flex gap-2">
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
};
