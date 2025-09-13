import { ManualTodoForm } from './ManualTodoForm.js';
import { ManualTodoList } from './ManualTodoList.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type FC, useCallback, useMemo, useRef, useState } from 'react';
import { manualTodoStats, useUpdateStat } from '@lib/stats.js';
import { microloop, shortId } from '@anchorlib/core';
import { CircleQuestionMark, Gauge } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { BENCHMARK_DEBOUNCE_TIME, BENCHMARK_SIZE } from '@lib/todo.js';
import { ManualTodoCode } from './ManualTodoCode.js';
import { debugRender } from '@anchorlib/react';
import { ManualTodoStats } from './ManualTodoStats.js';
import { isMobile } from '@lib/nav.js';

const [loop] = microloop(BENCHMARK_DEBOUNCE_TIME, BENCHMARK_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${performance.now() - start}ms.`));
};

export const ManualTodoApp: FC = () => {
  const [panel, setPanel] = useState({ info: false, code: false });
  const [todos, setTodos] = useState([
    { id: '1', text: 'Learn React state', completed: true },
    { id: '2', text: 'Learn Anchor state', completed: false },
    { id: '3', text: 'Master Anchor state', completed: false },
  ]);

  const [stats, setStats] = useState({
    total: 3,
    completed: 1,
    active: 2,
  });

  const toggleInfo = useCallback(() => {
    setPanel((prev) => ({ ...prev, info: !prev.info }));
  }, []);

  const toggleCode = useCallback(() => {
    setPanel((prev) => ({ ...prev, code: !prev.code }));
  }, []);

  const addTodo = useCallback((text: string) => {
    const newTodo = {
      id: shortId(),
      text,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
    setStats((prev) => ({
      total: prev.total + 1,
      completed: prev.completed,
      active: prev.active + 1,
    }));
  }, []);

  const toggleTodo = useCallback(
    (id: string) => {
      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
          }
          return todo;
        })
      );

      setStats((prevStats) => {
        const todo = todos.find((todo) => todo.id === id);
        if (!todo) return prevStats;

        if (todo.completed) {
          // Was completed, now active
          return {
            total: prevStats.total,
            completed: prevStats.completed - 1,
            active: prevStats.active + 1,
          };
        } else {
          // Was active, now completed
          return {
            total: prevStats.total,
            completed: prevStats.completed + 1,
            active: prevStats.active - 1,
          };
        }
      });
    },
    [todos]
  );

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => {
      const todoToRemove = prev.find((todo) => todo.id === id);
      if (!todoToRemove) return prev;

      // Update stats atomically with todos
      setStats((prevStats) => ({
        total: prevStats.total - 1,
        completed: todoToRemove.completed ? prevStats.completed - 1 : prevStats.completed,
        active: !todoToRemove.completed ? prevStats.active - 1 : prevStats.active,
      }));

      return prev.filter((todo) => todo.id !== id);
    });
  }, []);

  const addBenchmarkItem = useCallback(() => {
    const newTodo = {
      id: shortId(),
      text: `New Todo (${todos.length + 1})`,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
    setStats((prev) => ({
      total: prev.total + 1,
      completed: prev.completed,
      active: prev.active + 1,
    }));
  }, [todos.length]);

  useUpdateStat(() => {
    manualTodoStats.app.value++;
  });

  // Memoize props to prevent unnecessary re-renders
  const formProps = useMemo(
    () => ({
      onAdd: addTodo,
    }),
    [addTodo]
  );

  const listProps = useMemo(
    () => ({
      todos,
      onToggle: toggleTodo,
      onRemove: removeTodo,
    }),
    [todos, toggleTodo, removeTodo]
  );

  const statsProps = useMemo(
    () => ({
      stats,
    }),
    [stats]
  );

  const panelProps = useMemo(
    () => ({
      panel,
      toggleInfo,
      toggleCode,
    }),
    [panel, toggleInfo, toggleCode]
  );

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">👍 Optimized Todo List</h3>
        {!isMobile() && (
          <button onClick={() => benchmark(addBenchmarkItem)} className="anchor-icon-btn">
            <Gauge size={20} />
            <Tooltip>Benchmark - Add {BENCHMARK_SIZE} items</Tooltip>
          </button>
        )}
        <ManualTodoPanel {...panelProps} />
      </CardHeader>
      <ManualInfoPanel panel={panel} />
      <div className="p-4">
        <ManualTodoForm {...formProps} />
        <ManualTodoList {...listProps} />
      </div>
      <ManualTodoStats {...statsProps} />
      <p className="text-slate-500 text-xs text-center px-10 mb-4">
        Stats are computed during mutation to prevent extensive resource usage from filtering. This also to showcase the
        complexity level of the optimization.
      </p>
      <ManualCodePanel panel={panel} />
    </Card>
  );
};

const ManualTodoPanel: FC<{
  panel: { info: boolean; code: boolean };
  toggleInfo: () => void;
  toggleCode: () => void;
}> = ({ panel, toggleInfo, toggleCode }) => {
  const ref = useRef<HTMLDivElement>(null);

  debugRender(ref);

  return (
    <div ref={ref} className="flex items-center">
      <button onClick={toggleInfo} className="anchor-icon-btn mr-4">
        <CircleQuestionMark size={20} />
        <Tooltip>{panel.info ? 'Hide' : 'Show'} Info</Tooltip>
      </button>
      <button className="anchor-btn btn-alternate" onClick={toggleCode}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
};

const ManualInfoPanel: FC<{ panel: { info: boolean } }> = ({ panel }) => {
  const ref = useRef<HTMLDivElement>(null);

  debugRender(ref);

  return (
    <div ref={ref} className="text-sm text-slate-400">
      {panel.info && (
        <p className="px-4 pt-4">
          AI optimized version of the Classic Todo List. While it's optimized, it's still struggling to perform as the
          Anchor's version with fine-grained reactivity; yet it has more verbose code to maintain.
        </p>
      )}
    </div>
  );
};

const ManualCodePanel: FC<{ panel: { code: boolean } }> = ({ panel }) => {
  const ref = useRef<HTMLDivElement>(null);

  debugRender(ref);

  return (
    <div ref={ref} className="bg-slate-950">
      {panel.code && <ManualTodoCode />}
    </div>
  );
};
