import React, { memo } from 'react';
import { useDerived } from '@anchor/react';
import { TodoItem } from './TodoItem.js';
import type { TodoItemProp } from '../Types.js';
import { todoStats, useUpdateStat } from '../stats/stats.js';

export const TodoList: React.FC<{ todos: TodoItemProp[] }> = memo(({ todos }) => {
  const [items] = useDerived(todos);

  useUpdateStat(() => {
    todoStats.list.value++;
  });
  console.log('Rendering todo list');
  return (
    <ul className="mt-4 space-y-2">
      {items.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
});
