import TodoAppCode from './TodoApp.js?raw';
import TodoItemCode from './TodoItem.js?raw';
import TodoListCode from './TodoList.js?raw';
import TodoFormCode from './TodoForm.js?raw';
import { CodeBlock } from '../CodeBlock.js';
import { memo } from 'react';

export const TodoCode = memo(() => {
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
  ];

  return (
    <>
      {codeBlocks.map((block) => (
        <div key={block.name} className="flex flex-col">
          <h4 className="text-slate-500 px-2 py-1 text-sm my-2">{block.name}</h4>
          <CodeBlock code={block.code} />
        </div>
      ))}
    </>
  );
});
