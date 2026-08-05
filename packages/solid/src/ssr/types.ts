import type { AnyType } from '@anchorlib/core';
import type { CoreAppOptions, SSRContext, SSROptions, SSROutput, SSRRenderOptions } from '@anchorlib/ssr';
import type { Component, JSX } from 'solid-js';
import type { BindableComponent } from '../hoc.js';
import type { BindableProps } from '../types.js';

export type AppShell = BindableComponent<BindableProps<JSX.HTMLAttributes<HTMLElement>>>;
export type AppEntry = Component<{ url?: string }>;
export type AppOptions<E = AnyType> = Omit<CoreAppOptions<E>, 'router'>;

export type LegacySSRRenderer = (
  urlOrOptions: string | SSRRenderOptions,
  cookie?: string,
  context?: SSRContext,
  controller?: AbortController,
  Shell?: AppShell,
  isolated?: boolean,
  optionsObj?: SSROptions
) => Promise<SSROutput>;
