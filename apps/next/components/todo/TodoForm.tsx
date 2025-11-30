import { type FC, type FormEventHandler, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { shortId } from '@anchorlib/core';
import { debugRender } from '@anchorlib/react-classic';
import { Button } from '@anchorlib/react-kit/components';
import { todoStats, useUpdateStat } from '@utils/stats';
import { itemsWriter, statsWriter } from '@utils/todo';

export const TodoForm: FC = () => {
  const ref = useRef(null);
  const [newText, setNewText] = useState('');

  const addTodo: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    itemsWriter.push({
      id: shortId(),
      text: newText,
      completed: false,
    });
    statsWriter.total++;
    statsWriter.active++;

    setNewText('');
  };

  debugRender(ref);
  useUpdateStat(() => {
    todoStats.form.value++;
  });

  return (
    <form
      ref={ref}
      className="flex gap-3 px-4 pb-4 border-b border-b-slate-300/50 dark:border-b-slate-600/50"
      onSubmit={addTodo}
    >
      <input
        type="text"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="Add a new todo..."
        className="ark-input flex-grow"
      />
      <Button type="submit" disabled={!newText}>
        <Plus size={16} />
      </Button>
    </form>
  );
};
