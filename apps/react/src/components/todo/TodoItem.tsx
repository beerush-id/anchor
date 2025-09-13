import { type FC, memo, useEffect, useRef } from 'react';
import { todoStats, useUpdateStat } from '@lib/stats.js';
import { BENCHMARK_DEBOUNCE_TIME, BENCHMARK_TOGGLE_SIZE, itemsWriter, type ITodoItem, statsWriter } from '@lib/todo.js';
import { Button, IconButton } from '../Button.js';
import { Gauge, Square, SquareCheck, Trash2 } from 'lucide-react';
import { debugRender, useWriter } from '@anchorlib/react';
import { microloop } from '@anchorlib/core';
import { Tooltip } from '../Tooltip.js';
import { observe } from '@anchorlib/react/components';

const [loop] = microloop(BENCHMARK_DEBOUNCE_TIME, BENCHMARK_TOGGLE_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${(performance.now() - start).toLocaleString()}ms.`));
};

export const TodoItem: FC<{ todo: ITodoItem }> = memo(({ todo }) => {
  const selfRef = useRef<HTMLLIElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

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

  const ItemView = observe(() => {
    const { text, completed } = todo;
    debugRender(viewRef);

    return (
      <div ref={viewRef} className="flex items-center flex-1 gap-3 bg-slate-800/70 p-2 rounded-md">
        <label className="text-slate-300">
          <input type="checkbox" checked={completed} onChange={handleToggle} className="sr-only" />
          {completed && <SquareCheck />}
          {!completed && <Square />}
        </label>
        <span className={`text-semibold text-sm ${completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
          {text}
        </span>
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
