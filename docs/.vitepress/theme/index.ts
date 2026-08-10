// https://vitepress.dev/guide/custom-theme

import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { Sandbox } from 'vitepress-plugin-sandpack';
import { h } from 'vue';
import 'vitepress-plugin-sandpack/dist/style.css';
import './style.css';
// @ts-expect-error
import AnchorReactSandbox from './AnchorReactSandbox.vue';
// @ts-expect-error
import AnchorSolidSandbox from './AnchorSolidSandbox.vue';
// @ts-expect-error
import AnchorSvelteSandbox from './AnchorSvelteSandbox.vue';
// @ts-expect-error
import AnchorVueSandbox from './AnchorVueSandbox.vue';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'home-hero-info-before': () =>
        h(
          'a',
          {
            href: '/news/release-v1.3.0',
            class: 'version-tag',
          },
          'Release v1.3.0'
        ),
    });
  },
  enhanceApp({ app, router, siteData }) {
    // ...
    // DefaultTheme.enhanceApp({ app, router, siteData });
    app.component('Sandbox', Sandbox);
    app.component('AnchorReactSandbox', AnchorReactSandbox);
    app.component('AnchorSolidSandbox', AnchorSolidSandbox);
    app.component('AnchorSvelteSandbox', AnchorSvelteSandbox);
    app.component('AnchorVueSandbox', AnchorVueSandbox);
  },
} satisfies Theme;
