import { type FC, memo, useEffect, useRef } from 'react';
import { flashNode, todoStats, useUpdateStat } from '@lib/stats.js';
import { BENCHMARK_TOGGLE_SIZE, type ITodoItem, type ITodoList, type ITodoStats } from '@lib/todo.js';
import { Button } from '../Button.js';
import { Gauge, Trash2 } from 'lucide-react';
import { useDerived } from '@anchor/react';
import { microloop } from '@anchor/core';
import { Tooltip } from '../Tooltip.js';

const [loop] = microloop(5, BENCHMARK_TOGGLE_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${(performance.now() - start).toLocaleString()}ms.`));
};

export const TodoItem: FC<{ todos: ITodoList; stats: ITodoStats; todo: ITodoItem }> = memo(({ todos, stats, todo }) => {
  const ref = useRef<HTMLLIElement>(null);
  const [text, completed] = useDerived(() => [todo.text, todo.completed], [todo]);

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.item.value++;
  });

  const handleRemove = () => {
    todos.splice(todos.indexOf(todo), 1);
    stats.total--;

    if (todo.completed) {
      stats.completed--;
    } else {
      stats.active--;
    }
  };

  const handleToggle = () => {
    todo.completed = !todo.completed;

    if (todo.completed) {
      stats.completed++;
      stats.active--;
    } else {
      stats.completed--;
      stats.active++;
    }
  };

  useEffect(() => {
    if (!ref.current || todo.id.length === 1) return;
    ref.current.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, [todo]);

  return (
    <li ref={ref} className="flex items-center gap-2">
      <div className="flex items-center flex-1 gap-3 bg-slate-800/70 p-2 rounded-md">
        <input
          type="checkbox"
          checked={completed}
          onChange={handleToggle}
          className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
        />
        <span className={`${completed ? 'flex-1 line-through text-slate-500' : 'flex-1'}`}>{text}</span>
      </div>
      <button
        onClick={() => benchmark(handleToggle)}
        className="hover:text-slate-200 text-slate-400 inline-flex items-center justify-center">
        <Gauge size={20} />
        <Tooltip>Toggle {BENCHMARK_TOGGLE_SIZE} times</Tooltip>
      </button>
      <Button onClick={() => handleRemove()} className="p-2 text-red-400 hover:bg-red-900/50">
        <Trash2 size={14} />
      </Button>
    </li>
  );
});
