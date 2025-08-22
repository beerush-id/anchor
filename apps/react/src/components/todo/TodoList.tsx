import { type FC, useRef } from 'react';
import { TodoItem } from './TodoItem.js';
import { flashNode, todoStats, useUpdateStat } from '../stats/stats.js';
import { type ITodoList } from '../../lib/todo.js';
import { observed } from '@anchor/react';

export const TodoList: FC<{ todos: ITodoList }> = observed(({ todos }) => {
  const ref = useRef(null);

  flashNode(ref.current);
  useUpdateStat(() => {
    todoStats.list.value++;
  });

  return (
    <ul ref={ref} className="mt-4 space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todos={todos} todo={todo} />
      ))}
    </ul>
  );
}, 'TodoList');
