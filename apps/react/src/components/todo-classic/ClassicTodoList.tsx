import React, { memo } from 'react';
import type { TodoItemProp } from '../Types.js';
import { ClassicTodoItem } from './ClassicTodoItem.js';
import { classicTodoStats, useUpdateStat } from '../stats/stats.js';

export const ClassicTodoList: React.FC<{ todos: TodoItemProp[]; onToggle: (id: number) => void }> = memo(
  ({ todos, onToggle }) => {
    useUpdateStat(() => {
      classicTodoStats.list.value++;
    });
    console.log('Rendering classic todo list');

    return (
      <ul className="mt-4 space-y-2">
        {todos.map((todo) => (
          <ClassicTodoItem key={todo.id} todo={todo} onToggle={onToggle} />
        ))}
      </ul>
    );
  }
);
