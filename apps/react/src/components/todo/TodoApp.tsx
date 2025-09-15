import { TodoForm } from './TodoForm.js';
import { TodoList } from './TodoList.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type FC, useRef } from 'react';
import { todoStats, useUpdateStat } from '@lib/stats.js';
import { debugRender, useAnchor } from '@anchorlib/react';
import { observable } from '@anchorlib/react/view';
import { microloop, shortId } from '@anchorlib/core';
import { CircleQuestionMark, Gauge } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { TodoStats } from './TodoStats.js';
import { BENCHMARK_DEBOUNCE_TIME, BENCHMARK_SIZE, itemsWriter, statsWriter } from '@lib/todo.js';
import { TodoCode } from './TodoCode.js';
import { isMobile } from '@lib/nav.js';

const [loop] = microloop(BENCHMARK_DEBOUNCE_TIME, BENCHMARK_SIZE);
const benchmark = (fn: () => void) => {
  const start = performance.now();
  loop(fn).then(() => console.log(`Profiling done in ${performance.now() - start}ms.`));
};

export const TodoApp: FC = () => {
  const [panel] = useAnchor({ info: false, code: false });

  const addBenchmarkItem = () => {
    itemsWriter.push({ id: shortId(), text: `New Todo (${itemsWriter.length + 1})`, completed: false });
    statsWriter.total++;
    statsWriter.active++;
  };

  useUpdateStat(() => {
    todoStats.app.value++;
  });

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">😍 Anchor Todo List</h3>
        {!isMobile() && (
          <button onClick={() => benchmark(addBenchmarkItem)} className="anchor-icon-btn">
            <Gauge size={20} />
            <Tooltip>Benchmark - Add {BENCHMARK_SIZE} items</Tooltip>
          </button>
        )}
        <TodoPanel panel={panel} />
      </CardHeader>
      <InfoPanel panel={panel} />
      <div className="p-4">
        <TodoForm />
        <TodoList />
      </div>
      <TodoStats />
      <p className="text-slate-500 text-xs text-center px-10 mb-4">
        Stats are computed during mutation to prevent extensive resource usage from filtering. This also to showcase the
        complexity level of the optimization.
      </p>
      <CodePanel panel={panel} />
    </Card>
  );
};

const TodoPanel: FC<{ panel: { info: boolean; code: boolean } }> = observable(({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="flex items-center">
      <button onClick={() => (panel.info = !panel.info)} className="anchor-icon-btn mr-4">
        <CircleQuestionMark size={20} />
        <Tooltip>{panel.info ? 'Hide' : 'Show'} Info</Tooltip>
      </button>
      <button className="anchor-btn btn-alternate" onClick={() => (panel.code = !panel.code)}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
}, 'TodoPanel');

const InfoPanel: FC<{ panel: { info: boolean } }> = observable(({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

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

const CodePanel: FC<{ panel: { code: boolean } }> = observable(({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="bg-slate-950">
      {panel.code && <TodoCode />}
    </div>
  );
}, 'CodePanel');
