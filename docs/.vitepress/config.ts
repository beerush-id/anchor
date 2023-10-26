import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/anchor/',
  title: 'Anchor',
  description: 'Anchor provides a robust yet simple solution for state management in JavaScript applications. Designed for developers who value simplicity amid the complexity of application state, Anchor brings ease, flexibility, and high performance to your applications.',
  head: [
    [ 'link', { rel: 'icon', href: '/assets/logo.svg' } ],
  ],
  themeConfig: {
    logo: '/assets/logo.svg',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' },
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/beerush-id/anchor' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present PT. <a href="https://beerush.io">Beerush Teknologi Indonesia</a>',
    },
    search: {
      provider: 'local',
    },
  },
});
