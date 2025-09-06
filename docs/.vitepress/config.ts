import { defineConfig } from 'vitepress';

const BASE_URL = '/docs';
const PAGE_URL = 'https://anchor.beerush.io/docs';
const PAGE_TITLE = 'Anchor Docs';
const PAGE_OPEN_TITLE = `${PAGE_TITLE} - State Management Library`;
const PAGE_OPEN_DESCRIPTION =
  'Anchor is a revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability.';
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
  head: [
    [
      'meta',
      {
        name: 'keywords',
        content:
          'state management, reactivity, immutability, javascript, typescript, vue, react, svelte, fine-grained reactivity, web development',
      },
    ],
    ['meta', { name: 'author', content: 'Nanang Mahdaen El Agung' }],
    ['meta', { property: 'og:title', content: PAGE_OPEN_TITLE }],
    ['meta', { property: 'og:description', content: PAGE_OPEN_DESCRIPTION }],
    ['meta', { property: 'og:image', content: PAGE_OPEN_THUMBNAIL }],
    ['meta', { property: 'og:url', content: PAGE_URL }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: PAGE_OPEN_TITLE }],
    ['meta', { name: 'twitter:description', content: PAGE_OPEN_DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: PAGE_OPEN_THUMBNAIL }],
    ['link', { rel: 'canonical', href: PAGE_URL }],
  ],
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
