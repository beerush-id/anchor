import { type FC, memo, useEffect, useRef } from 'react';
import { BENCHMARK_DEBOUNCE_TIME, BENCHMARK_TOGGLE_SIZE, type ITodoItem } from '@lib/todo.js';
import { classicTodoStats, useUpdateStat } from '@lib/stats.js';
import { Button, IconButton } from '../Button.js';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { microloop } from '@anchorlib/core';
import { Tooltip } from '../Tooltip.js';
import { debugRender } from '@anchorlib/react';

const [loop] = microloop(BENCHMARK_DEBOUNCE_TIME, BENCHMARK_TOGGLE_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${(performance.now() - start).toLocaleString()}ms.`));
};

export const ClassicTodoItem: FC<{
  todo: ITodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = memo(({ todo, onToggle, onRemove }) => {
  const ref = useRef<HTMLLIElement>(null);

  debugRender(ref);
  useUpdateStat(() => {
    classicTodoStats.item.value++;
  });

  const handleRemove = () => {
    onRemove(todo.id);
  };

  const handleToggle = () => {
    onToggle(todo.id);
  };

  useEffect(() => {
    if (!ref.current || todo.id.length === 1) return;
    ref.current.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, [todo]);

  return (
    <li ref={ref} className="flex items-center gap-2">
      <div className="flex items-center flex-1 gap-3 bg-slate-800/70 p-2 rounded-md">
        <label className="text-slate-300">
          <input type="checkbox" checked={todo.completed} onChange={handleToggle} className="sr-only" />
          {todo.completed && <SquareCheck />}
          {!todo.completed && <Square />}
        </label>
        <span className={`text-semibold text-sm ${todo.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
          {todo.text}
        </span>
      </div>
      <IconButton onClick={() => benchmark(() => onToggle(todo.id))}>
        <Gauge size={20} />
        <Tooltip>Toggle {BENCHMARK_TOGGLE_SIZE} times</Tooltip>
      </IconButton>
      <Button onClick={() => handleRemove()} className="btn-icon">
        <Trash2 size={14} />
      </Button>
    </li>
  );
});
