import ManualTodoAppCode from './ManualTodoApp.js?raw';
import ManualTodoItemCode from './ManualTodoItem.js?raw';
import ManualTodoListCode from './ManualTodoList.js?raw';
import ManualTodoFormCode from './ManualTodoForm.js?raw';
import TodoLib from '@lib/todo.js?raw';
import { memo } from 'react';
import { CodeViewer } from '../CodeViewer.js';

const codeBlocks = [
  {
    name: 'ManualTodoApp.tsx',
    code: ManualTodoAppCode,
  },
  {
    name: 'ManualTodoForm.tsx',
    code: ManualTodoFormCode,
  },
  {
    name: 'ManualTodoList.tsx',
    code: ManualTodoListCode,
  },
  {
    name: 'ManualTodoItem.tsx',
    code: ManualTodoItemCode,
  },
  {
    name: 'todo.ts',
    code: TodoLib,
  },
];

export const ManualTodoCode = memo(() => {
  return <CodeViewer items={codeBlocks} />;
});
