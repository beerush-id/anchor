import { type FC, useRef, useState } from 'react';
import { shortId } from '@anchorlib/core';
import { debugRender } from '@anchorlib/react-classic';
import { Card, CardHeader, Tooltip } from '@anchorlib/react-kit/components';

import { classicReport, type ITodoItem } from '@utils/todo';
import { classicTodoStats, useUpdateStat } from '@utils/stats';
import { CircleQuestionMark, Gauge } from 'lucide-react';
import { ClassicTodoStats } from './ClassicTodoStats';
import { ClassicTodoCode } from './ClassicTodoCode';
import { ClassicTodoForm } from './ClassicTodoForm';
import { ClassicTodoList } from './ClassicTodoList';
import { BENCHMARK_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  const { metrics, renderStats, progress } = await evaluate(fn);

  classicReport.enabled = true;
  classicReport.stats = { ...renderStats, duration: progress.renderDuration };
  classicReport.metrics = metrics;
};

export const ClassicTodoApp: FC = () => {
  const [panel, setPanel] = useState({ info: false, code: false });
  const [todos, setTodos] = useState([
    { id: '1', text: 'Learn React state', completed: true },
    { id: '2', text: 'Learn Anchor state', completed: false },
    { id: '3', text: 'Master Anchor state', completed: false },
  ]);
  const [stats, setStats] = useState({ total: 3, completed: 1, active: 2 });

  const handleOnAdd = (todo: ITodoItem) => {
    setTodos((current) => {
      const updated = [...current, todo];
      setStats((stats) => ({
        ...stats,
        total: updated.length,
        active: updated.length - stats.completed,
      }));
      return updated;
    });
  };

  const handleTextChange = (id: string, text: string) => {
    setTodos((current) =>
      current.map((item) => {
        if (item.id === id) {
          return { ...item, text };
        }
        return item;
      })
    );
  };

  const handleToggle = (id: string) => {
    const todo = todos.find((todo) => todo.id === id);
    if (!todo) return;

    todo.completed = !todo.completed;

    setTodos((current) =>
      current.map((item) => {
        if (item.id === id) {
          return { ...todo };
        }
        return item;
      })
    );

    setStats((current) => ({
      ...current,
      completed: todo?.completed ? current.completed + 1 : current.completed - 1,
      active: todo?.completed ? current.active - 1 : current.active + 1,
    }));
  };

  const handleRemove = (id: string) => {
    setTodos((current) => {
      const updated = current.filter((item) => item.id !== id);

      const item = current.find((todo) => todo.id === id);
      setStats((current) => ({
        ...current,
        total: updated.length,
        completed: item?.completed ? stats.completed - 1 : stats.completed,
        active: !item?.completed ? stats.active - 1 : stats.active,
      }));

      return updated;
    });
  };

  const toggleInfo = () => {
    setPanel((current) => ({ ...current, info: !current.info }));
  };

  const toggleCode = () => {
    setPanel((current) => ({ ...current, code: !current.code }));
  };

  const addBenchmarkItem = () => {
    setTodos((current) => {
      const updated = [
        ...current,
        {
          id: shortId(),
          text: `New todo (${current.length + 1})`,
          completed: false,
        },
      ];
      setStats((stats) => ({
        ...stats,
        total: updated.length,
        active: updated.length - stats.completed,
      }));
      return updated;
    });
  };

  useUpdateStat(() => {
    classicTodoStats.app.value++;
  });

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex-1">👌Classic Todo List</h3>
        <button onClick={() => benchmark(addBenchmarkItem)} className="ark-icon-button">
          <Gauge size={20} />
          <Tooltip>Benchmark - Add {BENCHMARK_SIZE} items</Tooltip>
        </button>
        <ClassicTodoPanel panel={panel} toggleInfo={toggleInfo} toggleCode={toggleCode} />
      </CardHeader>
      <ClassicInfoPanel panel={panel} />
      <div className="py-4">
        <ClassicTodoForm onAdd={handleOnAdd} />
        <ClassicTodoList
          todos={todos}
          onToggle={handleToggle}
          onRemove={handleRemove}
          onTextChange={handleTextChange}
        />
      </div>
      <ClassicTodoStats stats={stats} />
      <p className="text-slate-500 text-xs text-center px-10 mb-4">
        Stats are computed during mutation to prevent extensive resource usage from filtering. This also to showcase the
        complexity level of the optimization.
      </p>
      <ClassicCodePanel panel={panel} />
    </Card>
  );
};

const ClassicTodoPanel: FC<{
  panel: { info: boolean; code: boolean };
  toggleInfo: () => void;
  toggleCode: () => void;
}> = ({ panel, toggleInfo, toggleCode }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="flex items-center">
      <button onClick={toggleInfo} className="ark-icon-button mr-4">
        <CircleQuestionMark size={20} />
        <Tooltip>{panel.info ? 'Hide' : 'Show'} Info</Tooltip>
      </button>
      <button className="ark-button btn-alternate" onClick={toggleCode}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
};

const ClassicInfoPanel: FC<{ panel: { info: boolean } }> = ({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="text-sm text-slate-400">
      {panel.info && (
        <p className="px-4 pt-4">
          While it works, it's not very efficient because everything re-renders on changes. Component splitting also
          harder to maintain due to prop drilling effect (passing down the state controller).
        </p>
      )}
    </div>
  );
};

const ClassicCodePanel: FC<{ panel: { code: boolean } }> = ({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="bg-slate-950">
      {panel.code && <ClassicTodoCode />}
    </div>
  );
};
