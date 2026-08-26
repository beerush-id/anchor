import { type AnyRoute, classx, For, Link, mutable, setup, Show, Snippet } from '@airlib/react';
import { BuildIcon, DataObjectIcon, StorageIcon, UserInterfaceIcon } from '@/pages/(docs)/icons.js';
import { stateManagementImmutableRoute } from '@/pages/(docs)/state-management/route.js';
import { storageGettingStartedRoute } from '@/pages/(docs)/storage/route.js';
import { userInterfaceBrowserRoute } from '@/pages/(docs)/user-interface/route.js';
import { utilitiesIndexRoute } from '@/pages/(docs)/utilities/route.js';
import AdvancedCookieDemo from './AdvancedCookieDemo.mdx';
import AdvancedImmutableDemo from './AdvancedImmutableDemo.mdx';
import AdvancedLiveDemo from './AdvancedLiveDemo.mdx';
import AdvancedUtilityDemo from './AdvancedUtilityDemo.mdx';

type TabId = 'cookies' | 'live' | 'immutable' | 'utility';

const TABS = [
  {
    id: 'cookies' as TabId,
    title: 'Reactive Cookie',
    blurb: 'Reactive cookies auto-synced to the browser — always up to date end-to-end.',
    icon: StorageIcon,
    route: storageGettingStartedRoute,
  },
  {
    id: 'live' as TabId,
    title: 'LIVE Objects',
    blurb: 'Declarative browser events — write event handling as regular control flow.',
    icon: UserInterfaceIcon,
    route: userInterfaceBrowserRoute,
  },
  {
    id: 'immutable' as TabId,
    title: 'Immutable State',
    blurb: 'Zero-copy immutable state — share freely across components without risk of accidental mutation.',
    icon: DataObjectIcon,
    route: stateManagementImmutableRoute,
  },
  {
    id: 'utility' as TabId,
    title: 'Utility Rich',
    blurb: 'Everyday reactive helpers — undoable state, class composition, and timing utilities built into core.',
    icon: BuildIcon,
    route: utilitiesIndexRoute,
  },
];

export const Advanced = setup(() => {
  const selected = mutable<TabId>('cookies');

  return (
    <section className={classes.root}>
      <div className={`air-section-inner ${classes.inner}`}>
        <div className={classes.grid}>
          <div className={classes.copy}>
            <span className={classes.eyebrow}>Advanced</span>
            <h2 className={classes.title}>Batteries Included</h2>
            <p className={classes.body}>
              Beyond the headline features, the reactive core ships the primitives real apps are built from.
            </p>

            <div className={classes.tabs}>
              <For each={() => TABS}>
                {(tab) => (
                  <button
                    type="button"
                    className={classx('air-card flex items-start gap-4 text-left', {
                      active: selected.value === tab.id,
                    })}
                    onClick={() => (selected.value = tab.id)}
                  >
                    <tab.icon className="size-7 shrink-0 text-brand" />
                    <span className="flex flex-col gap-1">
                      <span className={classx(classes.tabTitle, { 'active text-primary': selected.value === tab.id })}>
                        {tab.title}
                      </span>
                      <span className={classes.tabBlurb}>{tab.blurb}</span>
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="air-mdx air-feature-demo w-full">
              <Show when={() => selected.value === 'cookies'}>{() => <AdvancedCookieDemo />}</Show>
              <Show when={() => selected.value === 'live'}>{() => <AdvancedLiveDemo />}</Show>
              <Show when={() => selected.value === 'immutable'}>{() => <AdvancedImmutableDemo />}</Show>
              <Show when={() => selected.value === 'utility'}>{() => <AdvancedUtilityDemo />}</Show>
            </div>

            <Snippet data={() => TABS.find((tab) => tab.id === selected.value)}>
              {(active) => (
                <Link to={active?.route as AnyRoute} className="air-cta">
                  Explore the docs
                </Link>
              )}
            </Snippet>
          </div>
        </div>
      </div>
    </section>
  );
});

const classes = {
  root: 'border-t border-border',
  inner: 'py-12 lg:py-20',
  grid: 'grid items-center gap-10 lg:grid-cols-2 lg:gap-14',
  copy: 'flex flex-col items-center gap-4 text-center lg:items-start lg:text-left',
  eyebrow: 'text-xs font-semibold uppercase tracking-wider text-brand',
  title: 'text-2xl font-bold text-on-surface lg:text-3xl',
  body: 'max-w-130 text-base leading-relaxed text-on-surface-variant lg:text-lg',
  tabs: 'mt-2 flex w-full max-w-100 flex-col gap-3',
  tabTitle: 'text-sm font-semibold text-on-surface transition-colors duration-200 ease-in-out',
  tabBlurb: 'text-xs leading-relaxed text-on-surface-variant',
};
