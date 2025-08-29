import { TodoForm } from './TodoForm.js';
import { TodoList } from './TodoList.js';
import { TodoCode } from './TodoCode.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type FC, useRef } from 'react';
import { flashNode, todoStats, useUpdateStat } from '@lib/stats.js';
import { CodeBlock } from '../CodeBlock.js';
import { observed, useAnchor } from '@anchor/react';
import { microloop, setDebugger, shortId } from '@anchor/core';
import { CircleQuestionMark, Gauge } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { TodoStats } from './TodoStats.js';
import { BENCHMARK_SIZE } from '@lib/todo.js';

const [loop] = microloop(5, BENCHMARK_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${performance.now() - start}ms.`));
};

export const TodoApp: FC = () => {
  setDebugger((...args) => console.log(...args));
  const [panel] = useAnchor({ info: false, code: false });
  const [todos] = useAnchor([
    { id: '1', text: 'Learn React state', completed: true },
    { id: '2', text: 'Learn Anchor state', completed: false },
    { id: '3', text: 'Master Anchor state', completed: false },
  ]);
  const [stats] = useAnchor({ total: 3, completed: 1, active: 2 });

  const addTodo = () => {
    todos.push({ id: shortId(), text: `New Todo (${todos.length + 1})`, completed: false });
    stats.total++;
    stats.active++;
  };

  useUpdateStat(() => {
    todoStats.app.value++;
  });

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">😍 Anchor Todo List</h3>
        <button
          onClick={() => benchmark(addTodo)}
          className="hover:text-slate-200 text-slate-400 inline-flex items-center justify-center mr-4">
          <Gauge size={20} />
          <Tooltip>Benchmark - Add {BENCHMARK_SIZE} items</Tooltip>
        </button>
        <TodoPanel panel={panel} />
      </CardHeader>
      <InfoPanel panel={panel} />
      <div className="p-4">
        <TodoForm todos={todos} stats={stats} />
        <TodoList todos={todos} stats={stats} />
      </div>
      <TodoStats stats={stats} />
      <p className="text-slate-500 text-xs text-center px-10 mb-4">
        Stats are computed during mutation to prevent extensive resource usage from derivation. This also to showcase
        the complexity level of the optimization.
      </p>
      <CodePanel panel={panel} />
    </Card>
  );
};

const TodoPanel: FC<{ panel: { info: boolean; code: boolean } }> = observed(({ panel }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="flex items-center">
      <button
        onClick={() => (panel.info = !panel.info)}
        className="hover:text-slate-200 text-slate-400 inline-flex items-center justify-center mr-4">
        <CircleQuestionMark size={20} />
      </button>
      <button
        className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium"
        onClick={() => (panel.code = !panel.code)}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
}, 'TodoPanel');

const InfoPanel: FC<{ panel: { info: boolean } }> = observed(({ panel }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="text-sm text-slate-400">
      {panel.info && (
        <p className="px-4 pt-4">
          Not just works, but also efficient. Components only re-renders when needed. Component splitting also way
          easier due to each component manage its own control.
        </p>
      )}
    </div>
  );
}, 'InfoPanel');

const CodePanel: FC<{ panel: { code: boolean } }> = observed(({ panel }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="bg-slate-950">
      {!panel.code && (
        <CodeBlock
          code={`const TodoItem = ({ item }) => {
  const handleChange = () => {
    item.completed = !item.completed;
  };
};`}
        />
      )}
      {panel.code && <TodoCode />}
    </div>
  );
}, 'CodePanel');
