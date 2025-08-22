import TodoAppCode from './TodoApp.js?raw';
import TodoItemCode from './TodoItem.js?raw';
import TodoListCode from './TodoList.js?raw';
import TodoFormCode from './TodoForm.js?raw';
import { CodeBlock } from '../CodeBlock.js';
import { memo, useState } from 'react';

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

export const TodoCode = memo(() => {
  const [active, setActive] = useState(codeBlocks[0].name);

  return (
    <div className="todo-tabs">
      <div className="tabs flex items-center gap-2">
        {codeBlocks.map((block) => (
          <button
            key={block.name}
            className={'tab px-2 py-1 text-sm font-medium' + (active === block.name ? ' bg-slate-900' : '')}
            onClick={() => setActive(block.name)}>
            {block.name}
          </button>
        ))}
      </div>
      {codeBlocks
        .filter((block) => block.name === active)
        .map((block) => (
          <div key={block.name} className="tab-content flex flex-col">
            <CodeBlock code={block.code} />
          </div>
        ))}
    </div>
  );
});
