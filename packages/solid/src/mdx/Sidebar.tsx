import { $symbol, type AnyType, classx, effect, mutable, uIndex } from '@airlib/core';
import type { PreloadMode } from '@airlib/router';
import { Link, uiRouterCtx } from '../router/index.js';
import { For, type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';

const SIDEBAR_NODE_INDEX = $symbol('air.mdx.sidebar.node');

export interface NavItem {
  text?: string;
  href?: string;
  icon?: () => JSX.Element;
  route?: AnyType;
  items?: NavItem[];
  title?: string;
  separator?: boolean;
  collapsed?: boolean;
}

export interface SidebarProps extends JSX.HTMLAttributes<HTMLElement> {
  nav: NavItem[];
  preload?: PreloadMode;
  collapsible?: boolean;
}

export function Sidebar(allProps: SidebarProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['nav', 'class', 'preload', 'collapsible']);

  return (
    <nav {...restProps} class={classx('air-mdx-sidebar-nav', props.class)}>
      <For each={props.nav}>
        {(item) => <SidebarNode item={item} preload={props.preload} collapsible={props.collapsible} />}
      </For>
    </nav>
  );
}

export interface SidebarNodeProps extends JSX.HTMLAttributes<AnyType> {
  item: NavItem;
  level?: number;
  preload?: PreloadMode;
  collapsible?: boolean;
}

export function SidebarNode(allProps: SidebarNodeProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['item', 'class', 'level', 'preload', 'collapsible']);

  const ctx = uiRouterCtx.get();
  const collapsible = props.collapsible ?? false;
  const state = mutable({
    collapsed: collapsible && (props.item.collapsed ?? false),
  });
  const childrenId = `sbn-${uIndex(SIDEBAR_NODE_INDEX)}`;

  const toggleCollapsed = () => {
    state.collapsed = !state.collapsed;
  };

  const hasActiveRoute = (item: NavItem): boolean => {
    if (item.route?.active) return true;

    if (item.href && ctx?.router) {
      if (ctx.router.context.fullPath === item.href) return true;
    }

    if (item.items) return item.items.some(hasActiveRoute);
    return false;
  };

  effect(() => {
    if (hasActiveRoute(props.item)) {
      state.collapsed = false;
    }
  });

  const Chevron = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16px"
      viewBox="0 -960 960 960"
      width="16px"
      fill="currentColor"
      aria-hidden="true"
      class="air-mdx-sidebar-chevron"
    >
      <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
    </svg>
  );

  return (
    <Show
      when={!props.item.separator}
      fallback={<hr {...restProps} class={classx('air-mdx-sidebar-separator', props.class)} />}
    >
      <Show
        when={props.item.items && props.item.items.length > 0}
        fallback={
          <Show
            when={props.item.route}
            fallback={
              <Show
                when={props.item.href}
                fallback={
                  <div
                    {...restProps}
                    class={classx('air-mdx-sidebar-item', props.class)}
                    style={{ '--air-nav-level': `${props.level ?? 0}` } as Record<string, string>}
                  >
                    <SidebarItem icon={props.item.icon} text={props.item.text} />
                  </div>
                }
              >
                <Link
                  {...restProps}
                  href={props.item.href}
                  preload={props.preload}
                  keepVisible
                  class={classx('air-mdx-sidebar-item', props.class)}
                  activeClass="active"
                  style={{ '--air-nav-level': `${props.level ?? 0}` } as Record<string, string>}
                >
                  <SidebarItem icon={props.item.icon} text={props.item.text} />
                </Link>
              </Show>
            }
          >
            <Link
              {...restProps}
              to={props.item.route}
              preload={props.preload}
              keepVisible
              class={classx('air-mdx-sidebar-item', props.class)}
              activeClass="active"
              style={{ '--air-nav-level': `${props.level ?? 0}` } as Record<string, string>}
            >
              <SidebarItem icon={props.item.icon} text={props.item.text} />
            </Link>
          </Show>
        }
      >
        <div
          {...restProps}
          role="group"
          aria-label={props.item.text}
          class={classx('air-mdx-sidebar-group-container', { collapsed: state.collapsed }, props.class)}
          style={{ '--air-nav-level': `${props.level ?? 0}` } as Record<string, string>}
        >
          <Show when={props.item.text}>
            <Show
              when={props.item.route}
              fallback={
                <Show
                  when={collapsible}
                  fallback={
                    <div class="air-mdx-sidebar-group" aria-hidden="true">
                      <SidebarItem icon={props.item.icon} text={props.item.text} />
                    </div>
                  }
                >
                  <button
                    type="button"
                    class="air-mdx-sidebar-group air-mdx-sidebar-group-toggle"
                    aria-expanded={!state.collapsed}
                    aria-controls={childrenId}
                    onClick={toggleCollapsed}
                  >
                    <SidebarItem icon={props.item.icon} text={props.item.text} />
                    <Chevron />
                  </button>
                </Show>
              }
            >
              <div class="air-mdx-sidebar-group-wrapper">
                <Link
                  to={props.item.route}
                  preload={props.preload}
                  keepVisible
                  class="air-mdx-sidebar-group"
                  activeClass="active"
                >
                  <SidebarItem icon={props.item.icon} text={props.item.text} />
                </Link>
                <Show when={collapsible}>
                  <button
                    type="button"
                    class="air-mdx-sidebar-toggle-btn"
                    aria-expanded={!state.collapsed}
                    aria-controls={childrenId}
                    aria-label={`Toggle ${props.item.text} section`}
                    onClick={toggleCollapsed}
                  >
                    <Chevron />
                  </button>
                </Show>
              </div>
            </Show>
          </Show>
          <div id={childrenId} class="air-mdx-sidebar-children" aria-hidden={state.collapsed}>
            <For each={props.item.items}>
              {(child) => (
                <SidebarNode
                  item={child}
                  level={(props.level ?? 0) + 1}
                  preload={props.preload}
                  collapsible={collapsible}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
    </Show>
  );
}

export function SidebarItem(props: { icon?: () => JSX.Element; text?: string }): JSX.Element {
  return (
    <>
      <Show when={props.icon}>
        <span class="air-mdx-sidebar-icon" aria-hidden="true">
          {props.icon?.()}
        </span>
      </Show>
      <Show when={props.text}>
        <span class="air-mdx-sidebar-text">{props.text}</span>
      </Show>
    </>
  );
}
