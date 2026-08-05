import type { AnyType } from '@anchorlib/core';
import type { CoreAppOptions, SSRContext, SSROptions, SSROutput, SSRRenderOptions } from '@anchorlib/ssr';
import type { HTMLAttributes } from 'react';
import type { StableComponent } from '../types.js';

export type AppShell = StableComponent<HTMLAttributes<HTMLElement>>;
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
