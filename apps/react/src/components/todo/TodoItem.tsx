import { type FC, memo, useEffect, useRef } from 'react';
import { todoStats, useUpdateStat } from '@lib/stats.js';
import { BENCHMARK_TOGGLE_SIZE, type ITodoItem, type ITodoList, type ITodoStats } from '@lib/todo.js';
import { Button, IconButton } from '../Button.js';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender, useObserved } from '@anchor/react';
import { microloop } from '@anchor/core';
import { Tooltip } from '../Tooltip.js';

const [loop] = microloop(5, BENCHMARK_TOGGLE_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${(performance.now() - start).toLocaleString()}ms.`));
};

export const TodoItem: FC<{ todos: ITodoList; stats: ITodoStats; todo: ITodoItem }> = memo(({ todos, stats, todo }) => {
  const ref = useRef<HTMLLIElement>(null);
  const [text, completed] = useObserved(() => [todo.text, todo.completed]);

  debugRender(ref.current);
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
        <label className="text-slate-300">
          <input type="checkbox" checked={completed} onChange={handleToggle} className="sr-only" />
          {completed && <SquareCheck />}
          {!completed && <Square />}
        </label>
        <span className={`text-semibold text-sm ${completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
          {text}
        </span>
      </div>
      <IconButton onClick={() => benchmark(handleToggle)}>
        <Gauge size={20} />
        <Tooltip>Toggle {BENCHMARK_TOGGLE_SIZE} times</Tooltip>
      </IconButton>
      <Button onClick={() => handleRemove()} className="btn-icon">
        <Trash2 size={14} />
      </Button>
    </li>
  );
});
