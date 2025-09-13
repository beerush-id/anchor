import { type FC, useRef } from 'react';
import { TodoItem } from './TodoItem.js';
import { todoStats, useUpdateStat } from '@lib/stats.js';
import { type ITodoList, todoApp } from '@lib/todo.js';
import { debugRender, useObservedList } from '@anchor/react';

export const TodoList: FC = () => {
  const ref = useRef(null);
  const todos = useObservedList(todoApp.todos as ITodoList, 'id');

  debugRender(ref);
  useUpdateStat(() => {
    todoStats.list.value++;
  });

  if (!todos.length) {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">No todos yet.</p>;
  }

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.key} todo={todo.value} />
      ))}
    </ul>
  );
};
