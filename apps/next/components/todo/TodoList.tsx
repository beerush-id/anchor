import { type FC, useRef } from 'react';
import { debugRender, useObservedList } from '@anchorlib/react';
import { todoStats, useUpdateStat } from '@utils/stats';
import { type ITodoList, todoApp } from '@utils/todo';
import { TodoItem } from './TodoItem';

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
    <ul ref={ref} className="p-4 space-y-2 max-h-[360px] overflow-y-auto">
      {todos.map((todo) => (
        <TodoItem key={todo.key} todo={todo.value} />
      ))}
    </ul>
  );
};
