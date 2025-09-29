import { type FC, useRef } from 'react';
import { CircleQuestionMark, Gauge } from 'lucide-react';
import { shortId } from '@anchorlib/core';
import { debugRender, observer, useAnchor } from '@anchorlib/react';
import { isMobile } from '@anchorlib/react-kit/utils';
import { Card, CardHeader, Tooltip } from '@anchorlib/react-kit/components';
import { todoStats, useUpdateStat } from '@utils/stats';

import { itemsWriter, statsWriter } from '@utils/todo';

import { TodoStats } from './TodoStats';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';
import { TodoCode } from './TodoCode';
import { BENCHMARK_SIZE, evaluate } from '@utils/benchmark';

const benchmark = async (fn: () => void) => {
  await evaluate(fn);
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
        <h3 className="font-semibold flex-1">😍 Anchor Todo List</h3>
        {!isMobile() && (
          <button onClick={() => benchmark(addBenchmarkItem)} className="ark-icon-button">
            <Gauge size={20} />
            <Tooltip>Benchmark - Add {BENCHMARK_SIZE} items</Tooltip>
          </button>
        )}
        <TodoPanel panel={panel} />
      </CardHeader>
      <InfoPanel panel={panel} />
      <div className="py-4">
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

const TodoPanel: FC<{ panel: { info: boolean; code: boolean } }> = observer(({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="flex items-center">
      <button onClick={() => (panel.info = !panel.info)} className="ark-icon-button mr-4">
        <CircleQuestionMark size={20} />
        <Tooltip>{panel.info ? 'Hide' : 'Show'} Info</Tooltip>
      </button>
      <button className="ark-button btn-alternate" onClick={() => (panel.code = !panel.code)}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
}, 'TodoPanel');

const InfoPanel: FC<{ panel: { info: boolean } }> = observer(({ panel }) => {
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

const CodePanel: FC<{ panel: { code: boolean } }> = observer(({ panel }) => {
  const ref = useRef(null);

  debugRender(ref);

  return (
    <div ref={ref} className="bg-slate-950">
      {panel.code && <TodoCode />}
    </div>
  );
}, 'CodePanel');
