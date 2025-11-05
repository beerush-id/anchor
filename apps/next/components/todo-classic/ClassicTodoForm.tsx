import { type FC, type FormEventHandler, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { shortId } from '@anchorlib/core';
import { debugRender } from '@anchorlib/react';
import { Button } from '@anchorlib/react-kit/components';

import { type ITodoItem } from '@utils/todo';
import { classicTodoStats, useUpdateStat } from '@utils/stats';

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
    <form
      ref={ref}
      className="flex gap-3 px-4 pb-4 border-b border-b-slate-300/50 dark:border-b-slate-600/50"
      onSubmit={addTodo}
    >
      <input
        type="text"
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        placeholder="Add a new todo..."
        className="ark-input flex-grow"
      />
      <Button type="submit" disabled={!newTodoText}>
        <Plus size={16} />
      </Button>
    </form>
  );
};
