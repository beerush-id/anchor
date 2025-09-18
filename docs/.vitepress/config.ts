import { defineConfig, type HeadConfig } from 'vitepress';
// @ts-ignore
import container from 'markdown-it-container';
import { renderSandbox } from 'vitepress-plugin-sandpack';
import llmstxt from 'vitepress-plugin-llms';

const BASE_URL = !process.env.WORKER_BUILD ? '/anchor/docs' : '';
const PAGE_URL = process.env.WORKER_BUILD_URL ?? 'https://beerush-id.github.io/anchor/docs/';
const PAGE_TITLE = 'Anchor Docs';
const PAGE_OPEN_TITLE = `${PAGE_TITLE} - Fine-Grained Reactivity with True Immutability`;
const PAGE_OPEN_DESCRIPTION =
  'Anchor is a revolutionary state management framework for modern web applications with fine-grained reactivity and true immutability. First-class support for React, Vue, Svelte, and vanilla JavaScript/TypeScript.';
const PAGE_OPEN_THUMBNAIL = `${PAGE_URL}social.jpg`;

const analytics =
  process.env.NODE_ENV === 'production'
    ? [
        ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-SSMTTBW5G5' }],
        [
          'script',
          {},
          `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-SSMTTBW5G5');`,
        ],
      ]
    : [];

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
    ['link', { rel: 'canonical', href: PAGE_URL }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon.ico` }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon-196x196.png`, sizes: '196x196' }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon-128x128.png`, sizes: '128x128' }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon-96x96.png`, sizes: '96x96' }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon-32x32.png`, sizes: '32x32' }],
    ['link', { rel: 'icon', href: `${BASE_URL}/icons/favicon-16x16.png`, sizes: '16x16' }],
    ...(analytics as HeadConfig[]),
    [
      'meta',
      {
        name: 'keywords',
        content:
          'state management, reactivity, immutability, javascript, typescript, vue, react, svelte, fine-grained reactivity, web development, enterprise apps, dsv model, data state view',
      },
    ],
    ['meta', { name: 'author', content: 'Nanang Mahdaen El Agung' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: PAGE_OPEN_TITLE }],
    ['meta', { property: 'og:description', content: PAGE_OPEN_DESCRIPTION }],
    ['meta', { property: 'og:image', content: PAGE_OPEN_THUMBNAIL }],
    ['meta', { property: 'og:image:alt', content: 'Anchor State Management Library' }],
    ['meta', { property: 'og:url', content: PAGE_URL }],
    ['meta', { property: 'og:site_name', content: 'Anchor Docs' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: PAGE_OPEN_TITLE }],
    ['meta', { name: 'twitter:description', content: PAGE_OPEN_DESCRIPTION }],
    ['meta', { name: 'twitter:image', content: PAGE_OPEN_THUMBNAIL }],
    ['meta', { name: 'twitter:image:alt', content: 'Anchor State Management Library' }],
    ['meta', { name: 'twitter:site', content: '@beerush_id' }],
    ['link', { rel: 'canonical', href: PAGE_URL }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Overview', link: '/overview' },
      { text: 'Get Started', link: '/getting-started' },
      { text: 'Unit Tests', link: 'https://beerush-id.github.io/anchor/coverage' },
      { text: 'Test Coverage', link: 'https://beerush-id.github.io/anchor/coverage/details' },
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
        collapsed: false,
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
        text: 'Anchor for React',
        collapsed: false,
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
            text: 'Reactivity',
            link: '/react/reactivity',
          },
          {
            text: 'Immutability',
            link: '/react/immutability',
          },
          {
            text: 'Ref System',
            link: '/react/ref-system',
          },
          {
            text: 'Guides',
            collapsed: true,
            items: [
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
            text: 'Tutorials',
            collapsed: true,
            items: [
              {
                text: 'Scalable Todo App',
                link: '/react/tutorials/todo-app',
              },
              {
                text: 'Form Validation',
                link: '/react/tutorials/form-validation',
              },
            ],
          },
        ],
      },
      {
        text: 'Anchor for Svelte',
        collapsed: true,
        items: [
          {
            text: 'Introduction',
            link: '/svelte/introduction',
          },
          {
            text: 'Getting Started',
            link: '/svelte/getting-started',
          },
          {
            text: 'Reactivity',
            link: '/svelte/reactivity',
          },
          {
            text: 'Immutability',
            link: '/svelte/immutability',
          },
          {
            text: 'State Management',
            link: '/svelte/state-management',
          },
        ],
      },
      {
        text: 'Anchor for Vue',
        collapsed: true,
        items: [
          {
            text: 'Introduction',
            link: '/vue/introduction',
          },
          {
            text: 'Getting Started',
            link: '/vue/getting-started',
          },
          {
            text: 'Reactivity',
            link: '/vue/reactivity',
          },
          {
            text: 'Immutability',
            link: '/vue/immutability',
          },
          {
            text: 'State Management',
            link: '/vue/state-management',
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
    ],

    footer: {
      message: 'Made with ❤️ by <a href="https://www.mahdaen.name" target="_blank">Nanang Mahdaen El Agung</a>',
      copyright: 'Copyright © 2025 Anchor. All rights reserved.',
    },
    editLink: {
      pattern: 'https://github.com/beerush-id/anchor/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/beerush-id/anchor' },
      { icon: 'discord', link: 'https://discord.gg/aEFgpaghq2' },
    ],
  },
  markdown: {
    config: (md) => {
      const defaultRender = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];

        if (token.info === 'sveltehtml') {
          token.info = 'svelte';
        }

        return defaultRender?.(tokens, idx, options, env, self) ?? '';
      };

      md.use(container, 'sandbox', {
        render(tokens: any[], idx: number) {
          return renderSandbox(tokens, idx, 'sandbox');
        },
      }).use(container, 'anchor-react-sandbox', {
        render(tokens: any[], idx: number) {
          return renderSandbox(tokens, idx, 'anchor-react-sandbox');
        },
      });
    },
  },
  vite: {
    plugins: [llmstxt() as never],
  },
});
