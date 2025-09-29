import { memo } from 'react';
import { CodeViewer } from '@anchorlib/react-kit/components';

import TodoAppCode from './TodoApp.tsx?raw';
import TodoItemCode from './TodoItem.tsx?raw';
import TodoListCode from './TodoList.tsx?raw';
import TodoFormCode from './TodoForm.tsx?raw';
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

export const TodoCode = memo(function TodoCode() {
  return <CodeViewer items={codeBlocks} maxHeight={500} />;
});
