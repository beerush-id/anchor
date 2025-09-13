import { Button } from '../Button.js';
import { Plus } from 'lucide-react';
import { type FC, type FormEventHandler, useRef, useState } from 'react';
import { type ITodoItem } from '@lib/todo.js';
import { classicTodoStats, useUpdateStat } from '@lib/stats.js';
import { shortId } from '@anchorlib/core';
import { debugRender } from '@anchorlib/react';

export const ClassicTodoForm: FC<{ onAdd: (todo: ITodoItem) => void }> = ({ onAdd }) => {
  const ref = useRef(null);
  const [newTodoText, setNewTodoText] = useState('');

  const addTodo: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    onAdd({
      id: shortId(),
      text: newTodoText,
      completed: false,
    });

    setNewTodoText('');
  };

  debugRender(ref);
  useUpdateStat(() => {
    classicTodoStats.form.value++;
  });

  return (
    <form ref={ref} className="flex gap-3" onSubmit={addTodo}>
      <input
        type="text"
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        placeholder="Add a new todo..."
        className="anchor-input flex-grow"
      />
      <Button type="submit" disabled={!newTodoText}>
        <Plus size={16} />
      </Button>
    </form>
  );
};
