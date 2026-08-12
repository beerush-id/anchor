import { getContext, Link, mutable, onMount, setup, Show } from '../index.js';
import { docsCtx } from './context.js';

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

export const TableOfContent = setup(() => {
  const state = mutable({
    headings: [] as TocHeading[],
    activeId: '',
    mounted: false,
  });

  onMount(() => {
    state.mounted = true;
  });

  const ctx = docsCtx.get();
  const headings = getContext<{ value: TocHeading[] }>('air-headings');

  return (
    <div className="air-docs-toc">
      <div className="air-docs-toc-title">On this page</div>
      <nav>
        <Show when={() => (ctx?.url && headings?.value) as TocHeading[]}>
          {(heads) =>
            heads.map((h) => (
              <Link
                key={h.id}
                href={`#${h.id}`}
                className={`air-docs-toc-link ${state.activeId === h.id ? 'active' : ''}`}
                style={{ paddingLeft: `${h.depth - 2}rem` }}
              >
                {h.text}
              </Link>
            ))
          }
        </Show>
      </nav>
    </div>
  );
}, 'TableOfContent');
