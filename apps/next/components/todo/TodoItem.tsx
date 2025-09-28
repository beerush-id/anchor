import { type FC, memo, useEffect, useRef } from 'react';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender, observe, useWriter } from '@anchorlib/react';
import { Button, IconButton, Tooltip } from '@anchorlib/react-kit/components';
import { itemsWriter, type ITodoItem, statsWriter } from '@utils/todo';
import { todoStats, useUpdateStat } from '@utils/stats';
import { BENCHMARK_TOGGLE_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  await evaluate(fn, BENCHMARK_TOGGLE_SIZE);
};

export const TodoItem: FC<{ todo: ITodoItem }> = memo(function TodoItem({ todo }) {
  const selfRef = useRef<HTMLLIElement>(null);

  debugRender(selfRef);
  useUpdateStat(() => {
    todoStats.item.value++;
  });

  const itemWriter = useWriter(todo, ['completed']);
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

  const ItemView = observe<HTMLButtonElement>((ref) => {
    const { text, completed } = todo;
    debugRender(ref);

    return (
      <button
        ref={ref}
        onClick={handleToggle}
        className="flex items-center flex-1 gap-3 bg-slate-200/70 dark:bg-slate-800/70 p-2 rounded-md dark:text-slate-300">
        {completed && <SquareCheck />}
        {!completed && <Square />}
        <span className={`text-semibold text-sm ${completed ? 'line-through' : ''}`}>{text}</span>
      </button>
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
