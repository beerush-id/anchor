import { TodoForm } from './TodoForm.js';
import { TodoList } from './TodoList.js';
import { TodoCode } from './TodoCode.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { useFlatArray } from '@anchor/react';
import { type FC, type ReactNode, useState } from 'react';
import { todoStats, useUpdateStat } from '../stats/stats.js';
import { CodeBlock } from '../CodeBlock.js';
import { TodoContext } from '../../lib/todo.js';

export const TodoApp: FC<{ children?: ReactNode }> = ({ children }) => {
  const [showCode, setShowCode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [todos, , snapshot] = useFlatArray(
    [
      { id: 1, text: 'Master React state', completed: true },
      { id: 2, text: 'Try Anchor', completed: false },
    ],
    { immutable: true, deps: [] }
  );

  useUpdateStat(() => {
    todoStats.app.value++;
  });
  console.log('Rendering todo app:', snapshot);

  return (
    <TodoContext value={todos}>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">😍 Anchor Todo List</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="hover:text-slate-200 hover:border-slate-200 rounded-full w-4 h-4 border border-slate-400 text-xs text-slate-400 inline-flex items-center justify-center mr-4">
            i
          </button>
          <button
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium"
            onClick={() => setShowCode(!showCode)}>
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </CardHeader>
        {showInfo && (
          <p className="px-4 pt-4 text-sm text-slate-400">
            Not just works, but also efficient. Components only re-renders when needed. Component splitting also way
            easier due to each component manage its own control.
          </p>
        )}
        <div className="p-4">
          <TodoForm />
          <TodoList />
        </div>
        {children}
        <CodeBlock
          code={`const TodoItem = ({ item }) => {
  const handleChange = () => {
    item.completed = !item.completed;
  };
};`}
        />
        {showCode && (
          <div className="bg-slate-950">
            <TodoCode />
          </div>
        )}
      </Card>
    </TodoContext>
  );
};
