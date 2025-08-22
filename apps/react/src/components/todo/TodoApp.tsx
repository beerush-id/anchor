import { TodoForm } from './TodoForm.js';
import { TodoList } from './TodoList.js';
import { TodoCode } from './TodoCode.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type FC, type ReactNode, useRef, useState } from 'react';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { CodeBlock } from '../CodeBlock.js';
import { anchor, shortId } from '@anchor/core';
import { observed } from '@anchor/react';

export const TodoApp: FC<{ children?: ReactNode }> = ({ children }) => {
  const [panel] = useState(() => {
    return anchor({ info: false, code: false });
  });
  const [todos] = useState(() => {
    return anchor([
      { id: shortId(), text: 'Master React state', completed: true },
      { id: shortId(), text: 'Try Anchor', completed: false },
    ]);
  });

  useUpdateStat(() => {
    todoStats.app.value++;
  });

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">😍 Anchor Todo List</h3>
        <TodoPanel panel={panel} />
      </CardHeader>
      <InfoPanel panel={panel} />
      <div className="p-4">
        <TodoForm todos={todos} />
        <TodoList todos={todos} />
      </div>
      {children}
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
        className="hover:text-slate-200 hover:border-slate-200 rounded-full w-4 h-4 border border-slate-400 text-xs text-slate-400 inline-flex items-center justify-center mr-4">
        i
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
