import { type FC, memo, useCallback, useEffect, useRef } from 'react';
import { manualTodoStats, useUpdateStat } from '@lib/stats.js';
import { BENCHMARK_TOGGLE_SIZE, type ITodoItem } from '@lib/todo.js';
import { Button, IconButton } from '../Button.js';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { microloop } from '@anchor/core';
import { Tooltip } from '../Tooltip.js';
import { debugRender } from '@anchor/react';

const [loop] = microloop(5, BENCHMARK_TOGGLE_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${(performance.now() - start).toLocaleString()}ms.`));
};

export const ManualTodoItem: FC<{
  todo: ITodoItem;
  onToggle: () => void;
  onRemove: () => void;
}> = memo(
  ({ todo, onToggle, onRemove }) => {
    const ref = useRef<HTMLLIElement>(null);

    debugRender(ref);
    useUpdateStat(() => {
      manualTodoStats.item.value++;
    });

    const handleRemove = useCallback(() => {
      onRemove();
    }, [onRemove]);

    const handleToggle = useCallback(() => {
      onToggle();
    }, [onToggle]);

    const handleBenchmarkToggle = useCallback(() => {
      benchmark(() => onToggle());
    }, [onToggle]);

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
          <span
            className={`text-semibold text-sm ${todo.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
            {todo.text}
          </span>
        </div>
        <IconButton onClick={handleBenchmarkToggle}>
          <Gauge size={20} />
          <Tooltip>Toggle {BENCHMARK_TOGGLE_SIZE} times</Tooltip>
        </IconButton>
        <Button onClick={handleRemove} className="btn-icon">
          <Trash2 size={14} />
        </Button>
      </li>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if the todo item itself changed or the callback functions changed
    return (
      prevProps.todo.id === nextProps.todo.id &&
      prevProps.todo.text === nextProps.todo.text &&
      prevProps.todo.completed === nextProps.todo.completed &&
      prevProps.onToggle === nextProps.onToggle &&
      prevProps.onRemove === nextProps.onRemove
    );
  }
);
