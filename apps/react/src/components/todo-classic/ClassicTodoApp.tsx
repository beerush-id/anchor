import { ClassicTodoCode } from './ClassicTodoCode.js';
import React, { useState } from 'react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import type { TodoItemProp } from '../Types.js';
import { ClassicTodoForm } from './ClassicTodoForm.js';
import { ClassicTodoList } from './ClassicTodoList.js';
import { classicTodoStats, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoApp: React.FC = () => {
  const [showCode, setShowCode] = useState(false);
  const [todos, setTodos] = useState([
    { id: 1, text: 'Master React state', completed: true },
    { id: 2, text: 'Try Anchor', completed: false },
  ]);

  const handleOnAdd = (todo: TodoItemProp) => {
    setTodos([...todos, todo]);
  };

  const handleToggle = (id: number) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  useUpdateStat(() => {
    classicTodoStats.app.value++;
  });
  console.log('Rendering classic todo app');
  return (
    <>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">Classic Todo List</h3>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md" onClick={() => setShowCode(!showCode)}>
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </CardHeader>
        <div className="p-6">
          <ClassicTodoForm onAdd={handleOnAdd} />
          <ClassicTodoList todos={todos} onToggle={handleToggle} />
        </div>
        {showCode && (
          <div className="bg-slate-950">
            <ClassicTodoCode />
          </div>
        )}
      </Card>
    </>
  );
};
