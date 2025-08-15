import { type FC, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../Button.js';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { useDerivedContext } from '@anchor/react';
import { TodoContext } from '../../lib/todo.js';

export const TodoForm: FC = () => {
  const [todos] = useDerivedContext(TodoContext);
  const ref = useRef(null);
  const [newText, setNewText] = useState('');

  const addTodo = () => {
    todos.push({
      id: todos.length + 1,
      text: newText,
      completed: false,
    });

    setNewText('');
  };

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.form.value++;
  });
  console.log('Rendering todo form.');
  return (
    <div ref={ref} className="flex gap-2">
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
};
