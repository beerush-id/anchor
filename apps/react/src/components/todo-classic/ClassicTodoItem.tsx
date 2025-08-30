import { type FC, memo, useEffect, useRef } from 'react';
import { BENCHMARK_TOGGLE_SIZE, type ITodoItem } from '@lib/todo.js';
import { classicTodoStats, flashNode, useUpdateStat } from '@lib/stats.js';
import { Button } from '../Button.js';
import { Gauge, Trash2 } from 'lucide-react';
import { microloop } from '@anchor/core';
import { Tooltip } from '../Tooltip.js';

const [loop] = microloop(5, BENCHMARK_TOGGLE_SIZE);
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

  flashNode(ref.current);
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
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-brand-purple focus:ring-brand-purple"
        />
        <span className={`${todo.completed ? 'line-through text-slate-500' : ''}`}>{todo.text}</span>
      </div>
      <button
        onClick={() => benchmark(() => onToggle(todo.id))}
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
