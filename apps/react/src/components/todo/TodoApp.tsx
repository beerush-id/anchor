import { TodoForm } from './TodoForm.js';
import { TodoList } from './TodoList.js';
import { TodoCode } from './TodoCode.js';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { useFlatArray } from '@anchor/react';
import React, { useState } from 'react';
import { todoStats, useUpdateStat } from '../stats/stats.js';

export const TodoApp: React.FC = () => {
  const [showCode, setShowCode] = useState(false);
  const [todos] = useFlatArray([
    { id: 1, text: 'Master React state', completed: true },
    { id: 2, text: 'Try Anchor', completed: false },
  ]);

  useUpdateStat(() => {
    todoStats.app.value++;
  });
  console.log('Rendering todo app');

  return (
    <>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">Anchor Todo List</h3>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md" onClick={() => setShowCode(!showCode)}>
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </CardHeader>
        <div className="p-6">
          <TodoForm todos={todos} />
          <TodoList todos={todos} />
        </div>
        {showCode && (
          <div className="bg-slate-950">
            <TodoCode />
          </div>
        )}
      </Card>
    </>
  );
};
