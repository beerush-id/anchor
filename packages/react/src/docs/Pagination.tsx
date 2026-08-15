import { derived, Link, Show, setup } from '../index.js';
import { mdxCtx } from './context.js';
import type { NavItem } from './Sidebar.js';

export interface PaginationProps {
  nav: NavItem[];
}

export const Pagination = setup<PaginationProps>((props) => {
  const ctx = mdxCtx.get();
  const flatLinks = flatten(props.nav);

  const links = derived.as(() => {
    if (!ctx?.url) return {};

    const currentIndex = flatLinks.findIndex((l) => l.route?.active);
    if (currentIndex === -1) return {};

    const prev = flatLinks[currentIndex - 1];
    const next = flatLinks[currentIndex + 1];

    return { prev, next };
  });

  return (
    <div className="air-docs-pagination">
      <Show when={() => links.prev}>
        {(p) => (
          <Link to={p!.route} className="air-docs-pagination-link air-docs-pagination-prev">
            <span>Previous</span>
            <strong>{p!.text}</strong>
          </Link>
        )}
      </Show>

      <Show when={() => links.next}>
        {(n) => (
          <Link to={n!.route} className="air-docs-pagination-link air-docs-pagination-next">
            <span>Next</span>
            <strong>{n!.text}</strong>
          </Link>
        )}
      </Show>
    </div>
  );
}, 'Pagination');

function flatten(items: NavItem[] = []) {
  return items.flatMap((item): NavItem[] => {
    return item.items ? [item, ...flatten(item.items)] : [item];
  }) as NavItem[];
}
