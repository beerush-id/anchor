import TodoAppCode from './TodoApp.js?raw';
import TodoItemCode from './TodoItem.js?raw';
import TodoListCode from './TodoList.js?raw';
import TodoFormCode from './TodoForm.js?raw';
import TodoLib from '@lib/todo.js?raw';
import { memo } from 'react';
import { CodeViewer } from '../CodeViewer.js';

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

export const TodoCode = memo(() => {
  return <CodeViewer items={codeBlocks} />;
});
