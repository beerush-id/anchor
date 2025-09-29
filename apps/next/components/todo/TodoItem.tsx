import { type FC, memo, useEffect, useRef } from 'react';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender, observe, useWriter } from '@anchorlib/react';
import { Button, IconButton, Tooltip } from '@anchorlib/react-kit/components';
import { anchorReport, itemsWriter, type ITodoItem, statsWriter } from '@utils/todo';
import { todoStats, useUpdateStat } from '@utils/stats';
import { BENCHMARK_TOGGLE_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  const { metrics, renderStats, progress } = await evaluate(fn, BENCHMARK_TOGGLE_SIZE);

  anchorReport.enabled = true;
  anchorReport.stats = { ...renderStats, duration: progress.renderDuration };
  anchorReport.metrics = metrics;
};

export const TodoItem: FC<{ todo: ITodoItem }> = memo(function TodoItem({ todo }) {
  const selfRef = useRef<HTMLLIElement>(null);

  debugRender(selfRef);
  useUpdateStat(() => {
    todoStats.item.value++;
  });

  const itemWriter = useWriter(todo, ['completed', 'text']);
  const handleToggle = () => {
    itemWriter.completed = !itemWriter.completed;

    if (todo.completed) {
      statsWriter.completed++;
      statsWriter.active--;
    } else {
      statsWriter.completed--;
      statsWriter.active++;
    }

    todoStats.item.value++;
  };

  const handleDelete = () => {
    itemsWriter.splice(itemsWriter.indexOf(todo), 1);
    statsWriter.total--;

    if (todo.completed) {
      statsWriter.completed--;
    } else {
      statsWriter.active--;
    }
  };

  useEffect(() => {
    if (!selfRef.current || todo.id.length === 1) return;
    selfRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, [todo]);

  const ItemView = observe<HTMLDivElement>((ref) => {
    const { completed } = todo;
    debugRender(ref);

    return (
      <div ref={ref} className="flex items-center flex-1 gap-3">
        <button onClick={handleToggle}>
          {completed && <SquareCheck />}
          {!completed && <Square />}
        </button>
        <input
          type="text"
          value={todo.text}
          onChange={(e) => (itemWriter.text = e.target.value)}
          className={`ark-input flex-1 text-semibold text-sm ${todo.completed ? 'line-through' : ''}`}
        />
      </div>
    );
  });

  return (
    <li ref={selfRef} className="flex items-center gap-2">
      <ItemView />
      <IconButton onClick={() => benchmark(handleToggle)}>
        <Gauge size={20} />
        <Tooltip>Toggle {BENCHMARK_TOGGLE_SIZE} times</Tooltip>
      </IconButton>
      <Button onClick={() => handleDelete()} className="btn-icon">
        <Trash2 size={14} />
      </Button>
    </li>
  );
});
