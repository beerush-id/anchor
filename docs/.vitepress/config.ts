import { defineConfig } from 'vitepress';

const BASE_URL = '/anchor/docs';
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
        text: 'Tutorials',
        collapsed: true,
        items: [
          {
            text: 'Form Validation',
            link: '/react/tutorial/form-validation',
          },
        ],
      },
      {
        text: 'Anchor - React',
        collapsed: true,
        items: [
          {
            text: 'Introduction',
            link: '/react/introduction',
          },
          {
            text: 'Getting Started',
            link: '/react/getting-started',
          },
          {
            text: 'Ref System',
            link: '/react/ref-system',
          },
          {
            text: 'Initialization',
            link: '/react/initialization',
          },
          {
            text: 'Observation',
            link: '/react/observation',
          },
          {
            text: 'Derivation',
            link: '/react/derivation',
          },
          {
            text: 'Components',
            link: '/react/components',
          },
          {
            text: 'Utilities',
            link: '/react/utilities',
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
        text: 'API Reference',
        collapsed: true,
        items: [
          {
            text: 'Core',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/core/initialization' },
              { text: 'Observation', link: '/apis/core/observation' },
              { text: 'Derivation', link: '/apis/core/derivation' },
              { text: 'History', link: '/apis/core/history' },
              { text: 'Request', link: '/apis/core/request' },
              { text: 'Context', link: '/apis/core/context' },
              { text: 'Types', link: '/apis/core/types' },
              { text: 'Utilities', link: '/apis/core/utility' },
            ],
          },
          {
            text: 'Storage',
            collapsed: true,
            items: [
              { text: 'Persistent', link: '/apis/storage/persistent' },
              { text: 'Session', link: '/apis/storage/session' },
              { text: 'Key-Value', link: '/apis/storage/kv' },
              { text: 'Table', link: '/apis/storage/table' },
              { text: 'Types', link: '/apis/storage/types' },
            ],
          },
          {
            text: 'React',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/react/initialization' },
              { text: 'Observation', link: '/apis/react/observation' },
              { text: 'Derivation', link: '/apis/react/derivation' },
              { text: 'Data Flow & Binding', link: '/apis/react/data-flow' },
              { text: 'Storage', link: '/apis/react/storage' },
              { text: 'Components', link: '/apis/react/components' },
              { text: 'Error Handling', link: '/apis/react/error-handling' },
              { text: 'Utilities', link: '/apis/react/utilities' },
            ],
          },
          {
            text: 'Svelte',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/svelte/initialization' },
              { text: 'Derivation', link: '/apis/svelte/derivation' },
              { text: 'Observation', link: '/apis/svelte/observation' },
              { text: 'Error Handling', link: '/apis/svelte/error-handling' },
              { text: 'Storage', link: '/apis/svelte/storage' },
              { text: 'Utilities', link: '/apis/svelte/utilities' },
            ],
          },
          {
            text: 'Vue',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/vue/initialization' },
              { text: 'Derivation', link: '/apis/vue/derivation' },
              { text: 'Observation', link: '/apis/vue/observation' },
              { text: 'Error Handling', link: '/apis/vue/error-handling' },
              { text: 'Storage', link: '/apis/vue/storage' },
              { text: 'Utilities', link: '/apis/vue/utilities' },
            ],
          },
          {
            text: 'Dev Tools',
            link: '/apis/devtool',
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
