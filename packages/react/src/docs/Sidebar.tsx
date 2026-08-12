import { type AnyRoute, For, Link, Show, template } from '../index.js';

export interface NavItem {
  text: string;
  link?: string;
  route?: AnyRoute;
  items?: NavItem[];
}

export interface SidebarProps {
  nav: NavItem[];
}

export const Sidebar = template<SidebarProps>(
  ({ nav }) => (
    <nav className="air-docs-sidebar-nav">
      <For each={() => nav}>{(item) => <SidebarNode item={item} />}</For>
    </nav>
  ),
  'DocsSidebar'
);

const SidebarNode = template<{ item: NavItem }>(({ item }) => {
  if (item.items && item.items.length > 0) {
    return (
      <div className="air-docs-sidebar-group-container">
        <Show when={() => item.text}>{() => <div className="air-docs-sidebar-group">{item.text}</div>}</Show>
        <div className="air-docs-sidebar-children">
          <For each={() => item.items!}>{(child) => <SidebarNode item={child} />}</For>
        </div>
      </div>
    );
  }

  if (item.route) {
    return (
      <Link to={item.route} className="air-docs-sidebar-link" activeClass="active">
        {item.text}
      </Link>
    );
  }

  if (item.link) {
    return (
      <Link href={item.link} className="air-docs-sidebar-link" activeClass="active">
        {item.text}
      </Link>
    );
  }

  return null;
}, 'SidebarNode');
