import { type FC, memo, useEffect, useRef } from 'react';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender } from '@anchorlib/react';
import { Button, IconButton, Tooltip } from '@anchorlib/react-kit/components';
import { type ITodoItem } from '@utils/todo';
import { classicTodoStats, useUpdateStat } from '@utils/stats';
import { BENCHMARK_TOGGLE_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  await evaluate(fn, BENCHMARK_TOGGLE_SIZE);
};

export const ClassicTodoItem: FC<{
  todo: ITodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}> = memo(function ClassicTodoItem({ todo, onToggle, onRemove }) {
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
      <button
        onClick={handleToggle}
        className="flex items-center flex-1 gap-3 bg-slate-200/70 dark:bg-slate-800/70 p-2 rounded-md">
        {todo.completed && <SquareCheck />}
        {!todo.completed && <Square />}
        <span className={`text-semibold text-sm ${todo.completed ? 'line-through' : ''}`}>{todo.text}</span>
      </button>
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
