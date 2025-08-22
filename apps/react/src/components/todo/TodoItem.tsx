import { type FC, memo, useRef } from 'react';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { type ITodoItem, type ITodoList } from '../../lib/todo.js';
import { Button } from '../Button.js';
import { Trash2 } from 'lucide-react';
import { observed } from '@anchor/react';

export const TodoItem: FC<{ todos: ITodoList; todo: ITodoItem }> = observed(
  memo(({ todos, todo }) => {
    const ref = useRef(null);

    flashNode(ref.current);
    useUpdateStat(() => {
      todoStats.item.value++;
    });

    const handleRemove = () => {
      todos.splice(todos.indexOf(todo), 1);
    };

    return (
      <>
        <li ref={ref} key={todo.id} className="flex items-center gap-2">
          <div className="flex items-center flex-1 gap-3 bg-slate-800/70 p-2 rounded-md">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => (todo.completed = !todo.completed)}
              className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
            />
            <span className={`${todo.completed ? 'flex-1 line-through text-slate-500' : 'flex-1'}`}>{todo.text}</span>
          </div>
          <Button onClick={() => handleRemove()} className="p-2 text-red-400 hover:bg-red-900/50">
            <Trash2 size={14} />
          </Button>
        </li>
      </>
    );
  }),
  'TodoItem'
);
