import { memo } from 'react';
import { CodeViewer } from '@anchorlib/react-kit/components';

import TodoAppCode from './ClassicTodoApp.tsx?raw';
import TodoItemCode from './ClassicTodoItem.tsx?raw';
import TodoListCode from './ClassicTodoList.tsx?raw';
import TodoFormCode from './ClassicTodoForm.tsx?raw';
import TodoLib from '@utils/todo.ts?raw';

const codeBlocks = [
  {
    name: 'TodoApp.tsx',
    code: TodoAppCode,
  },
  {
    name: 'TodoForm.tsx',
    code: TodoFormCode,
  },
  {
    name: 'TodoList.tsx',
    code: TodoListCode,
  },
  {
    name: 'TodoItem.tsx',
    code: TodoItemCode,
  },
  {
    name: 'todo.ts',
    code: TodoLib,
  },
];

export const ClassicTodoCode = memo(function ClassicTodoCode() {
  return <CodeViewer items={codeBlocks} maxHeight={500} />;
});
