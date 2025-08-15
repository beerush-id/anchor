import { ClassicTodoCode } from './ClassicTodoCode.js';
import React, { useState } from 'react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type ITodoItem, TodoContext } from '../../lib/todo.js';
import { ClassicTodoForm } from './ClassicTodoForm.js';
import { ClassicTodoList } from './ClassicTodoList.js';
import { classicTodoStats, useUpdateStat } from '../stats/stats.js';
import { CodeBlock } from '../CodeBlock.js';

export const ClassicTodoApp: React.FC = () => {
  const [showCode, setShowCode] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Master React state', completed: true },
    { id: 2, text: 'Try Anchor', completed: false },
  ]);

  const handleOnAdd = (todo: ITodoItem) => {
    setTodos([...todos, todo]);
  };

  const handleToggle = (id: number) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  useUpdateStat(() => {
    classicTodoStats.app.value++;
  });
  console.log('Rendering classic todo app:', todos);
  return (
    <TodoContext value={todos}>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">👌Classic Todo List</h3>
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
            While it works, it's not very efficient because everything re-renders on changes. Component splitting also
            harder to maintain due to callback-hell effect (passing down the state controller).
          </p>
        )}
        <div className="p-4">
          <ClassicTodoForm todos={todos} onAdd={handleOnAdd} />
          <ClassicTodoList todos={todos} onToggle={handleToggle} />
        </div>
        <CodeBlock
          code={`const TodoItem = ({ item, onToggle }) => {
  const handleChange = () => {
    onToggle(item);
  };
};`}
        />
        {showCode && (
          <div className="bg-slate-950">
            <ClassicTodoCode />
          </div>
        )}
      </Card>
    </TodoContext>
  );
};
