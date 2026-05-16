import container from 'markdown-it-container';
import { defineConfig, type HeadConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { renderSandbox } from 'vitepress-plugin-sandpack';

const BASE_URL = '/docs';
const PAGE_URL = process.env.VITE_WORKER_BUILD_URL ?? 'https://anchorlib.dev/docs/';
const ROOT_URL = process.env.VITE_ROOT_URL ?? 'https://anchorlib.dev';
const PAGE_TITLE = 'AIR Stack Docs';
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
  outDir: '../apps/next/public/docs',
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
      { text: 'Home', link: ROOT_URL },
      { text: 'Overview', link: '/overview' },
      { text: 'Get Started', link: '/getting-started' },
      { text: 'Unit Tests', link: 'https://anchorlib.dev/coverage' },
      { text: 'Test Coverage', link: 'https://anchorlib.dev/coverage/details' },
    ],

    sidebar: [
      {
        text: 'Overview',
        link: '/overview',
      },
      {
        text: 'Installation',
        link: '/installation',
      },
      {
        text: 'Getting Started',
        link: '/getting-started',
      },
      {
        text: 'Remote Function',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/remote-function/index.html' },
          { text: 'Functions', link: '/remote-function/function' },
          { text: 'Handlers', link: '/remote-function/handler' },
          { text: 'Transports', link: '/remote-function/transport' },
          { text: 'Distribution', link: '/remote-function/distribution' },
        ],
      },
      {
        text: 'State Management',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/state-management/index.html' },
          { text: 'Mutable State', link: '/state-management/mutable' },
          { text: 'Immutable State', link: '/state-management/immutable' },
          { text: 'Derived State', link: '/state-management/derived' },
          { text: 'Side Effects', link: '/state-management/side-effect' },
          { text: 'Async Handling', link: '/state-management/async-handling' },
          { text: 'Form Handling', link: '/state-management/form-handling' },
          { text: 'Advanced', link: '/state-management/advanced' },
        ],
      },
      {
        text: 'Routing',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/routing/index.html' },
          { text: 'Routes & Layouts', link: '/routing/routes-layouts' },
          { text: 'Navigation', link: '/routing/navigation' },
          { text: 'Guards & Authentication', link: '/routing/guards' },
          { text: 'Data Loaders & Providers', link: '/routing/data-loaders' },
        ],
      },
      {
        text: 'User Interface',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/ui/index.html' },
          { text: 'Styling', link: '/ui/styling' },
          { text: 'Static UI', link: '/ui/static' },
          { text: 'Reactive UI', link: '/ui/view' },
          { text: 'Component', link: '/ui/component' },
          { text: 'Data Components', link: '/ui/data' },
          { text: 'Form Components', link: '/ui/form' },
          { text: 'Headless Components', link: '/ui/headless' },
          { text: 'Composition', link: '/ui/composition' },
        ],
      },
      {
        text: 'IRPC',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/irpc/index.html' },
          { text: 'Getting Started', link: '/irpc/getting-started' },
          { text: 'Comparison', link: '/irpc/comparison' },
          { text: 'Specification', link: '/irpc/specification' },
          {
            text: 'Transports',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/irpc/transports/index.html' },
              { text: 'HTTP', link: '/irpc/transports/http-transport' },
              { text: 'WebSocket', link: '/irpc/transports/ws-transport' },
              { text: 'BroadcastChannel', link: '/irpc/transports/broadcast-transport' },
            ],
          },
        ],
      },
      {
        text: 'Anchor for React',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/react/index.html' },
          { text: 'Getting Started', link: '/react/getting-started' },
          {
            text: 'State Management',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/react/state/index.html' },
              { text: 'Mutable State', link: '/react/state/mutable' },
              { text: 'Immutable State', link: '/react/state/immutable' },
              { text: 'Derived State', link: '/react/state/derived' },
              { text: 'Side Effects', link: '/react/state/side-effect' },
              { text: 'Async Handling', link: '/react/state/async-handling' },
              { text: 'Form Handling', link: '/react/state/form-handling' },
              { text: 'Advanced', link: '/react/state/advanced' },
            ],
          },
          {
            text: 'Component Architecture',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/react/component/index.html' },
              { text: 'Component', link: '/react/component/setup' },
              { text: 'View', link: '/react/component/view' },
              { text: 'Lifecycle', link: '/react/component/lifecycle' },
              { text: 'Binding & Refs', link: '/react/component/binding' },
              // { text: 'Advanced', link: '/react/component/advanced' },
            ],
          },
          {
            text: 'Router',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/react/router/index.html' },
              { text: 'Routes & Layouts', link: '/react/router/routes-layouts' },
              { text: 'Navigation', link: '/react/router/navigation' },
              { text: 'Guards & Authentication', link: '/react/router/guards' },
              { text: 'Data Loaders & Providers', link: '/react/router/data-loaders' },
            ],
          },
          { text: 'Server-Side Rendering', link: '/react/ssr' },
          { text: 'Comparison', link: '/react/comparison' },
          { text: 'Best Practices', link: '/react/best-practices' },
          { text: 'Migration Guide', link: '/react/migration-guide' },
          { text: 'AI Knowledge Base', link: '/react/ai-knowledge-base' },
          { text: 'AI System Prompt', link: '/react/ai-system-prompt' },
          { text: 'FAQ', link: '/react/faq' },
          // {
          //   text: 'Tutorials',
          //   collapsed: true,
          //   items: [{ text: 'Index', link: '/react/tutorials/index' }],
          // },
          // {
          //   text: 'Legacy (Classic)',
          //   collapsed: true,
          //   items: [
          //     { text: 'Introduction', link: '/react-classic/introduction' },
          //     { text: 'Getting Started', link: '/react-classic/getting-started' },
          //     { text: 'Core Concepts', link: '/react-classic/core-concepts' },
          //     { text: 'API Reference', link: '/react-classic/api-reference' },
          //   ],
          // },
        ],
      },
      {
        text: 'Anchor for Solid',
        collapsed: true,
        items: [
          {
            text: 'Overview',
            link: '/solid/index.html',
          },
          {
            text: 'Getting Started',
            link: '/solid/getting-started',
          },
          {
            text: 'State Management',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/solid/state/index.html' },
              { text: 'Mutable State', link: '/solid/state/mutable' },
              { text: 'Immutable State', link: '/solid/state/immutable' },
              { text: 'Derived State', link: '/solid/state/derived' },
              { text: 'Data Binding', link: '/solid/state/binding' },
              { text: 'Async Handling', link: '/solid/state/async-handling' },
              { text: 'Form Handling', link: '/solid/state/form-handling' },
              { text: 'Advanced', link: '/solid/state/advanced' },
            ],
          },
          {
            text: 'Router',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/solid/router/index.html' },
              { text: 'Routes & Layouts', link: '/solid/router/routes-layouts' },
              { text: 'Navigation', link: '/solid/router/navigation' },
              { text: 'Guards & Authentication', link: '/solid/router/guards' },
              { text: 'Data Loaders & Providers', link: '/solid/router/data-loaders' },
            ],
          },
          { text: 'Server-Side Rendering', link: '/solid/ssr' },
          { text: 'AI Knowledge Base', link: '/solid/ai-knowledge-base' },
          { text: 'AI System Prompt', link: '/solid/ai-system-prompt' },
          { text: 'FAQ', link: '/solid/faq' },
        ],
      },
      {
        text: 'Anchor for Svelte',
        collapsed: true,
        items: [
          {
            text: 'Overview',
            link: '/svelte/index.html',
          },
          {
            text: 'Getting Started',
            link: '/svelte/getting-started',
          },
          {
            text: 'State Management',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/svelte/state/index.html' },
              { text: 'Mutable State', link: '/svelte/state/mutable' },
              { text: 'Immutable State', link: '/svelte/state/immutable' },
              { text: 'Derived State', link: '/svelte/state/derived' },
              { text: 'Async Handling', link: '/svelte/state/async-handling' },
              { text: 'Form Handling', link: '/svelte/state/form-handling' },
              { text: 'Advanced', link: '/svelte/state/advanced' },
            ],
          },
          { text: 'AI Knowledge Base', link: '/svelte/ai-knowledge-base' },
          { text: 'AI System Prompt', link: '/svelte/ai-system-prompt' },
          { text: 'FAQ', link: '/svelte/faq' },
        ],
      },
      {
        text: 'Anchor for Vue',
        collapsed: true,
        items: [
          {
            text: 'Overview',
            link: '/vue/index.html',
          },
          {
            text: 'Getting Started',
            link: '/vue/getting-started',
          },
          {
            text: 'State Management',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/vue/state/index.html' },
              { text: 'Mutable State', link: '/vue/state/mutable' },
              { text: 'Immutable State', link: '/vue/state/immutable' },
              { text: 'Derived State', link: '/vue/state/derived' },
            ],
          },
        ],
      },
      {
        text: 'Examples',
        collapsed: true,
        items: [{ text: 'Analytics Dashboard', link: '/examples/dashboard' }],
      },
      {
        text: 'Async',
        collapsed: true,
        items: [
          {
            text: 'Getting Started',
            link: '/async/getting-started',
          },
          {
            text: 'Query',
            link: '/async/query',
          },
          {
            text: 'Fetch',
            link: '/async/fetch',
          },
          {
            text: 'Stream',
            link: '/async/stream',
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
              { text: 'Reactivity', link: '/apis/core/reactivity' },
              { text: 'Async', link: '/apis/core/async' },
              { text: 'Fetch', link: '/apis/core/fetch' },
              { text: 'Subscription', link: '/apis/core/subscription' },
              { text: 'Binding', link: '/apis/core/binding' },
              { text: 'Form', link: '/apis/core/form' },
              { text: 'Context', link: '/apis/core/context' },
              { text: 'Lifecycle', link: '/apis/core/lifecycle' },
              { text: 'Dev Tools', link: '/apis/core/dev-tools' },
              { text: 'History', link: '/apis/core/history' },
              { text: 'Anchor', link: '/apis/core/anchor' },
              { text: 'Observation (Low-Level)', link: '/apis/core/observation' },
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
            text: 'React (Legacy)',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/react/initialization' },
              { text: 'Observation', link: '/apis/react/observation' },
              { text: 'Derivation', link: '/apis/react/derivation' },
              { text: 'Data Flow & Binding', link: '/apis/react/data-flow' },
              { text: 'Storage', link: '/apis/react/storage' },
              // { text: 'Components', link: '/apis/react/components' },
              { text: 'Error Handling', link: '/apis/react/error-handling' },
              { text: 'Utilities', link: '/apis/react/utilities' },
            ],
          },
          {
            text: 'Solid',
            collapsed: true,
            items: [
              { text: 'Initialization', link: '/apis/solid/initialization' },
              { text: 'Observation', link: '/apis/solid/observation' },
              { text: 'Fetch', link: '/apis/solid/fetch' },
              { text: 'History', link: '/apis/solid/history' },
              { text: 'Storage', link: '/apis/solid/storage' },
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
        text: 'Configuration',
        link: '/configuration',
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
      // {
      //   text: 'Architecture',
      //   link: '/architecture',
      // },
      // {
      //   text: 'Performance',
      //   link: '/performance',
      // },
      // {
      //   text: 'Philosophy',
      //   link: '/philosophy',
      // },
      {
        text: 'FAQ',
        link: '/faq',
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

        if (token.info.includes('sveltehtml')) {
          token.info = token.info.replace('sveltehtml', 'svelte');
        }

        return defaultRender?.(tokens, idx, options, env, self) ?? '';
      };

      md.use(container, 'sandbox', {
        render(tokens: any[], idx: number) {
          return renderSandbox(tokens, idx, 'sandbox');
        },
      })
        .use(container, 'anchor-react-sandbox', {
          render(tokens: any[], idx: number) {
            return renderSandbox(tokens, idx, 'anchor-react-sandbox');
          },
        })
        .use(container, 'anchor-solid-sandbox', {
          render(tokens: any[], idx: number) {
            return renderSandbox(tokens, idx, 'anchor-solid-sandbox');
          },
        })
        .use(container, 'anchor-svelte-sandbox', {
          render(tokens: any[], idx: number) {
            return renderSandbox(tokens, idx, 'anchor-svelte-sandbox');
          },
        })
        .use(container, 'anchor-vue-sandbox', {
          render(tokens: any[], idx: number) {
            return renderSandbox(tokens, idx, 'anchor-vue-sandbox');
          },
        });
    },
  },
  vite: {
    plugins: process.env.NODE_ENV === 'production' ? [llmstxt() as never] : [],
  },
});
