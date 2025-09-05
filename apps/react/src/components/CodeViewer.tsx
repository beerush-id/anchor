import { type FC, useState } from 'react';
import { CodeBlock } from './CodeBlock.js';

export type CodeItem = {
  name: string;
  code: string;
};

export const CodeViewer: FC<{ items: CodeItem[] }> = ({ items }) => {
  const [active, setActive] = useState(items[0].name);

  return (
    <div className="todo-tabs">
      <div className="tabs flex items-center gap-2 overflow-x-auto">
        {items.map((block) => (
          <button
            key={block.name}
            className={'tab px-3 py-2 text-sm font-medium' + (active === block.name ? ' bg-slate-900' : '')}
            onClick={() => setActive(block.name)}>
            {block.name}
          </button>
        ))}
      </div>
      {items
        .filter((block) => block.name === active)
        .map((block) => (
          <div key={block.name} className="tab-content flex flex-col">
            <CodeBlock code={block.code} />
          </div>
        ))}
    </div>
  );
};
