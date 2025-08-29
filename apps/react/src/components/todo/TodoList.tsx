import { type FC, useRef } from 'react';
import { TodoItem } from './TodoItem.js';
import { flashNode, todoStats, useUpdateStat } from '@lib/stats.js';
import { type ITodoList, type ITodoStats } from '@lib/todo.js';
import { observed, useDerivedList } from '@anchor/react';

export const TodoList: FC<{ todos: ITodoList; stats: ITodoStats }> = observed(({ todos, stats }) => {
  const ref = useRef(null);
  const items = useDerivedList(todos, 'id');

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.list.value++;
  });

  if (!items.length) {
    return <p className="text-slate-400 text-sm flex items-center justify-center mt-4">No todos yet.</p>;
  }

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {items.map((todo) => (
        <TodoItem key={todo.key} todos={todos} stats={stats} todo={todo.value} />
      ))}
    </ul>
  );
}, 'TodoList');
