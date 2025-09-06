import { type FC, type FormEventHandler, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../Button.js';
import { todoStats, useUpdateStat } from '@lib/stats.js';
import { type ITodoList, type ITodoStats } from '@lib/todo.js';
import { shortId } from '@anchor/core';
import { observable } from '@anchor/react/components';
import { debugRender } from '@anchor/react';

export const TodoForm: FC<{ todos: ITodoList; stats: ITodoStats }> = observable(({ todos, stats }) => {
  const ref = useRef(null);
  const [newText, setNewText] = useState('');

  const addTodo: FormEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    todos.push({
      id: shortId(),
      text: newText,
      completed: false,
    });
    stats.total++;
    stats.active++;

    setNewText('');
  };

  debugRender(ref);
  useUpdateStat(() => {
    todoStats.form.value++;
  });

  return (
    <form ref={ref} className="flex gap-3" onSubmit={addTodo}>
      <input
        type="text"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="Add a new todo..."
        className="anchor-input flex-grow"
      />
      <Button type="submit" disabled={!newText}>
        <Plus size={16} />
      </Button>
    </form>
  );
}, 'TodoForm');
