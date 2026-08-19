import type { PreloadMode } from '@anchorlib/router';
import type { HTMLAttributes, ReactNode } from 'react';
import { type AnyType, classx, For, Link, Show, template } from '../index.js';

export interface NavItem {
  text?: string;
  route?: AnyType;
  items?: NavItem[];
  icon?: () => ReactNode;
  separator?: boolean;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  nav: NavItem[];
  preload?: PreloadMode;
}

export const Sidebar = template<SidebarProps>(
  ({ nav, className, preload, ...restProps }) => (
    <nav {...restProps} className={classx('air-mdx-sidebar-nav', className)}>
      <For each={() => nav}>{(item) => <SidebarNode item={item} preload={preload} />}</For>
    </nav>
  ),
  'DocsSidebar'
);

export interface SidebarNodeProps extends HTMLAttributes<HTMLElement> {
  item: NavItem;
  level?: number;
  preload?: PreloadMode;
}

export const SidebarNode = template<SidebarNodeProps>(({ item, className, level, preload, ...restProps }) => {
  if (item.separator) {
    return <div {...restProps} className={classx('air-mdx-sidebar-separator', className)} />;
  }

  if (item.items && item.items.length > 0) {
    return (
      <div
        {...restProps}
        role="group"
        aria-label={item.text}
        className={classx('air-mdx-sidebar-group-container', className)}
        style={{ '--air-nav-level': `${level ?? 0}` } as Record<string, string>}
      >
        <Show when={() => item.text}>
          {() =>
            item.route ? (
              <Link
                to={item.route as AnyType}
                className="air-mdx-sidebar-link"
                activeClass="active"
                preload={preload}
                keepVisible
              >
                <SidebarItem icon={item.icon} text={item.text} />
              </Link>
            ) : (
              <div className="air-mdx-sidebar-group" aria-hidden="true">
                <SidebarItem icon={item.icon} text={item.text} />
              </div>
            )
          }
        </Show>
        <div className="air-mdx-sidebar-children">
          <For each={() => item.items!}>
            {(child) => (
              <SidebarNode item={child} preload={preload} level={typeof level === 'number' ? level + 1 : level} />
            )}
          </For>
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
        preload={preload}
        keepVisible
      >
        <SidebarItem icon={item.icon} text={item.text} />
      </Link>
    );
  }

  return (
    <span {...restProps} className={classx('air-mdx-sidebar-text', className)}>
      <SidebarItem icon={item.icon} text={item.text} />
    </span>
  );
}, 'SidebarNode');

const SidebarItem = template<{ icon?: () => ReactNode; text?: string }>(
  ({ icon, text }) => (
    <>
      {icon?.()}
      <span className="air-mdx-sidebar-item">{text}</span>
    </>
  ),
  'SidebarItem'
);
