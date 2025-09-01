import { defineConfig } from 'vitepress';

const BASE_URL = '/docs';
const PAGE_URL = 'https://anchor.beerush.io/docs';
const PAGE_TITLE = 'Anchor Docs';
const PAGE_OPEN_TITLE = `${PAGE_TITLE} - State Management Library`;
const PAGE_OPEN_DESCRIPTION = 'MonoPKG is a simple, yet beautiful package manager for monorepos.';
const PAGE_OPEN_THUMBNAIL = `${PAGE_URL}/social.jpg`;

// https://vitepress.dev/reference/site-config
export default defineConfig({
  outDir: '../apps/react/public/docs',
  base: BASE_URL,
  sitemap: {
    hostname: PAGE_URL,
  },
  title: PAGE_TITLE,
  description: PAGE_OPEN_DESCRIPTION,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs Home', link: '/' },
      { text: 'Overview', link: '/overview' },
      { text: 'Performance', link: '/performance' },
      { text: 'Philosophy', link: '/philosophy' },
      { text: 'Architecture', link: '/architecture' },
    ],

    sidebar: [
      {
        text: 'Overview',
        link: '/overview',
      },
      {
        text: 'Performance',
        link: '/performance',
      },
      {
        text: 'Philosophy',
        link: '/philosophy',
      },
      {
        text: 'Architecture',
        link: '/architecture',
      },
      {
        text: 'Guides',
        items: [
          {
            text: 'Getting Started',
            link: '/getting-started',
          },
          {
            text: 'Installation',
            link: '/installation',
          },
          {
            text: 'Usage',
            link: '/usage',
          },
          {
            text: 'Reactivity',
            link: '/reactivity',
          },
          {
            text: 'Immutability',
            link: '/immutability',
          },
          {
            text: 'Data Integrity',
            link: '/data-integrity',
          },
          {
            text: 'FAQ',
            link: '/faq',
          },
        ],
      },
      {
        text: 'Request',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/request/getting-started',
          },
          {
            text: 'Fetch',
            link: '/request/fetch',
          },
          {
            text: 'Stream',
            link: '/request/stream',
          },
        ],
      },
      {
        text: 'Storage',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/storage/getting-started',
          },
          {
            text: 'Usage',
            link: '/storage/usage',
          },
          {
            text: 'Persistent Storage',
            link: '/storage/local-storage',
          },
          {
            text: 'Session Storage',
            link: '/storage/session-storage',
          },
          {
            text: 'KV Store',
            link: '/storage/kv-store',
          },
          {
            text: 'Table Store',
            link: '/storage/table',
          },
        ],
      },
      {
        text: 'Anchor - React',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/react/getting-started',
          },
          {
            text: 'Usage',
            link: '/react/usage',
          },
          {
            text: 'Components',
            link: '/react/components',
          },
          {
            text: 'Utilities',
            link: '/react/utilities',
          },
          {
            text: 'Caveats',
            link: '/react/caveats',
          },
        ],
      },
      {
        text: 'Anchor - Svelte',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/svelte/getting-started',
          },
          {
            text: 'Usage',
            link: '/svelte/usage',
          },
          {
            text: 'Caveats',
            link: '/svelte/caveats',
          },
        ],
      },
      {
        text: 'Anchor - Vue',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/vue/getting-started',
          },
          {
            text: 'Usage',
            link: '/vue/usage',
          },
        ],
      },
      {
        text: 'Advanced',
        collapsed: true,
        items: [
          {
            text: 'Utilities',
            link: '/utilities',
          },
          {
            text: 'Dev Tools',
            link: '/dev-tools',
          },
        ],
      },
    ],

    footer: {
      message: 'Made with ❤️ by <a href="https://www.mahdaen.name" target="_blank">Nanang Mahdaen El Agung</a>',
      copyright: 'Copyright © 2025 Anchor. All rights reserved.',
    },
    editLink: {
      pattern: 'https://github.com/beerush-id/anchor/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/beerush-id/anchor' }],
  },
});
