import type { HTMLAttributes } from 'react';
import { type AnyType, classx, For, Link, Show, template } from '../index.js';

export interface NavItem {
  text: string;
  route?: AnyType;
  items?: NavItem[];
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  nav: NavItem[];
}

export const Sidebar = template<SidebarProps>(
  ({ nav, className, ...restProps }) => (
    <nav {...restProps} className={classx('air-mdx-sidebar-nav', className)}>
      <For each={() => nav}>{(item) => <SidebarNode item={item} />}</For>
    </nav>
  ),
  'DocsSidebar'
);

export interface SidebarNodeProps extends HTMLAttributes<HTMLElement> {
  item: NavItem;
}

export const SidebarNode = template<SidebarNodeProps>(({ item, className, ...restProps }) => {
  if (item.items && item.items.length > 0) {
    return (
      <div
        {...restProps}
        role="group"
        aria-label={item.text}
        className={classx('air-mdx-sidebar-group-container', className)}
      >
        <Show when={() => item.text}>
          {() =>
            item.route ? (
              <Link to={item.route as AnyType} className="air-mdx-sidebar-link" activeClass="active" keepVisible>
                {item.text}
              </Link>
            ) : (
              <div className="air-mdx-sidebar-group" aria-hidden="true">
                {item.text}
              </div>
            )
          }
        </Show>
        <div className="air-mdx-sidebar-children">
          <For each={() => item.items!}>{(child) => <SidebarNode item={child} />}</For>
        </div>
      </div>
    );
  }

  if (item.route) {
    return (
      <Link
        {...(restProps as AnyType)}
        to={item.route as AnyType}
        className={classx('air-mdx-sidebar-link', className)}
        activeClass="active"
        keepVisible
      >
        {item.text}
      </Link>
    );
  }

  return (
    <span {...restProps} className={classx('air-mdx-sidebar-text', className)}>
      {item.text}
    </span>
  );
}, 'SidebarNode');
