import { type HTMLAttributes, useState } from 'react';
import { CodeBlock } from './CodeBlock.js';
import { classx } from '@utils/classx.js';
import type { EFC } from '../../types.js';

export type CodeItem = {
  name: string;
  code: string;
  lang?: string;
  icon?: string;
  iconAlt?: string;
};

export type CodeViewerProps = HTMLAttributes<HTMLDivElement> & {
  items: CodeItem[];
  maxHeight?: number;
  minHeight?: number;
};

export const CodeViewer: EFC<CodeViewerProps, HTMLDivElement> = ({ items, minHeight, maxHeight, className }) => {
  const [active, setActive] = useState(items[0].name);

  return (
    <div className={classx(classx.brand('code-viewer'), className)}>
      <div className={classx.brand('code-viewer-buttons')}>
        {items.map((block) => (
          <button
            key={block.name}
            className={classx(classx.brand('code-viewer-button'), { active: block.name === active })}
            onClick={() => setActive(block.name)}
          >
            {block.icon && <img src={block.icon} alt={block.iconAlt} />}
            <span>{block.name}</span>
          </button>
        ))}
      </div>
      {items
        .filter((block) => block.name === active)
        .map((block) => (
          <div key={block.name} className={classx.brand('code-viewer-body')}>
            <CodeBlock code={block.code} lang={block.lang} minHeight={minHeight} maxHeight={maxHeight} />
          </div>
        ))}
    </div>
  );
};
