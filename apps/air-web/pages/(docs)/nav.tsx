import type { NavItem } from '@airlib/react/mdx';
import formMeta from '@airlib-cache/metadata/(docs)/airlib/form/index.js';
import componentsMeta from '@airlib-cache/metadata/(docs)/airlib/material-css/components/index.js';
import extensionsMeta from '@airlib-cache/metadata/(docs)/airlib/material-css/extensions/index.js';
import materialMeta from '@airlib-cache/metadata/(docs)/airlib/material-css/index.js';
import layoutMeta from '@airlib-cache/metadata/(docs)/airlib/material-css/layout/index.js';
import utilitiesMeta from '@airlib-cache/metadata/(docs)/airlib/material-css/utilities/index.js';
import docsMeta from '@airlib-cache/metadata/(docs)/index.js';
import remoteFunctionMeta from '@airlib-cache/metadata/(docs)/remote-function/index.js';
import routingMeta from '@airlib-cache/metadata/(docs)/routing/index.js';
import stateMeta from '@airlib-cache/metadata/(docs)/state-management/index.js';
import storageMeta from '@airlib-cache/metadata/(docs)/storage/index.js';
import uiMeta from '@airlib-cache/metadata/(docs)/user-interface/index.js';
import workflowMeta from '@airlib-cache/metadata/(docs)/workflow/index.js';
import type { ComponentType } from 'react';
import {
  AccountTreeIcon,
  BuildIcon,
  CallIcon,
  ChecklistIcon,
  DataObjectIcon,
  DnsIcon,
  DownloadIcon,
  ExtensionIcon,
  GridViewIcon,
  HomeIcon,
  MarkdownIcon,
  PaletteIcon,
  RocketLaunchIcon,
  RouteIcon,
  StorageIcon,
  StyleIcon,
  WidgetsIcon,
} from './icons.js';

const ICONS: Record<string, ComponentType> = {
  home: HomeIcon,
  download: DownloadIcon,
  'rocket-launch': RocketLaunchIcon,
  rocket: RocketLaunchIcon,
  dns: DnsIcon,
  markdown: MarkdownIcon,
  call: CallIcon,
  'account-tree': AccountTreeIcon,
  tree: AccountTreeIcon,
  'data-object': DataObjectIcon,
  object: DataObjectIcon,
  route: RouteIcon,
  palette: PaletteIcon,
  checklist: ChecklistIcon,
  style: StyleIcon,
  storage: StorageIcon,
  widgets: WidgetsIcon,
  'grid-view': GridViewIcon,
  grid: GridViewIcon,
  extension: ExtensionIcon,
  build: BuildIcon,
};

interface MetaEntry {
  path: string;
  meta: {
    nav?: string;
    title?: string;
    'nav-icon'?: string;
    'nav-priority'?: number;
    [key: string]: unknown;
  };
}

function toNavItems(entries: MetaEntry[], withIcon = false): NavItem[] {
  return entries
    .map(({ path, meta }) => {
      const text = meta.nav || meta.title || path;
      const priority = meta['nav-priority'] ?? 999;
      const Icon = withIcon && meta['nav-icon'] ? ICONS[meta['nav-icon']] : undefined;

      return {
        text,
        priority,
        href: path,
        title: meta.title,
        icon: Icon ? () => <Icon /> : undefined,
      };
    })
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map(({ text, href, icon, title }) => (icon ? { text, href, icon, title } : { text, href, title }));
}

export const navs: NavItem[] = [
  ...toNavItems(docsMeta, true),
  { separator: true },
  {
    text: 'Remote Function',
    icon: () => <CallIcon />,
    collapsed: true,
    items: toNavItems(remoteFunctionMeta),
  },
  {
    text: 'Workflows',
    icon: () => <AccountTreeIcon />,
    collapsed: true,
    items: toNavItems(workflowMeta),
  },
  {
    text: 'State Management',
    icon: () => <DataObjectIcon />,
    collapsed: true,
    items: toNavItems(stateMeta),
  },
  {
    text: 'Routing',
    icon: () => <RouteIcon />,
    collapsed: true,
    items: toNavItems(routingMeta),
  },
  {
    text: 'User Interface',
    icon: () => <PaletteIcon />,
    collapsed: true,
    items: toNavItems(uiMeta),
  },
  { separator: true },
  {
    text: 'AirLib Form',
    icon: () => <ChecklistIcon />,
    collapsed: true,
    items: toNavItems(formMeta),
  },
  {
    text: 'AirLib Material 3 CSS',
    icon: () => <StyleIcon />,
    collapsed: true,
    items: [
      ...toNavItems(materialMeta),
      {
        text: 'Components',
        icon: () => <WidgetsIcon />,
        items: toNavItems(componentsMeta),
      },
      {
        text: 'Layout',
        icon: () => <GridViewIcon />,
        items: toNavItems(layoutMeta),
      },
      {
        text: 'Extensions',
        icon: () => <ExtensionIcon />,
        items: toNavItems(extensionsMeta),
      },
      {
        text: 'Utilities',
        icon: () => <BuildIcon />,
        items: toNavItems(utilitiesMeta),
      },
    ],
  },
  {
    text: 'Storage',
    icon: () => <StorageIcon />,
    collapsed: true,
    items: toNavItems(storageMeta),
  },
];
