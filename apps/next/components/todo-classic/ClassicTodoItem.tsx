import { type FC, memo, useEffect, useRef } from 'react';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender } from '@anchorlib/react-classic';
import { Button, IconButton, Tooltip } from '@anchorlib/react-kit/components';
import { classicReport, type ITodoItem } from '@utils/todo';
import { classicTodoStats, useUpdateStat } from '@utils/stats';
import { BENCHMARK_TOGGLE_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  const { metrics, renderStats, progress } = await evaluate(fn, BENCHMARK_TOGGLE_SIZE);

  classicReport.enabled = true;
  classicReport.stats = { ...renderStats, duration: progress.renderDuration };
  classicReport.metrics = metrics;
};

export const ClassicTodoItem: FC<{
  todo: ITodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
}> = memo(function ClassicTodoItem({ todo, onToggle, onRemove, onTextChange }) {
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
      <button onClick={handleToggle} className="flex items-center">
        {todo.completed && <SquareCheck />}
        {!todo.completed && <Square />}
      </button>
      <input
        type="text"
        value={todo.text}
        onChange={(e) => onTextChange(todo.id, e.target.value)}
        className={`ark-input flex-1 text-semibold text-sm ${todo.completed ? 'line-through' : ''}`}
      />
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
