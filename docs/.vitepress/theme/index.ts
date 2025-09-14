// https://vitepress.dev/guide/custom-theme
import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { Sandbox } from 'vitepress-plugin-sandpack';
import 'vitepress-plugin-sandpack/dist/style.css';
import './style.css';
// @ts-ignore
import AnchorReactSandbox from './AnchorReactSandbox.vue';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    });
  },
  enhanceApp({ app, router, siteData }) {
    // ...
    // DefaultTheme.enhanceApp({ app, router, siteData });
    app.component('Sandbox', Sandbox);
    app.component('AnchorReactSandbox', AnchorReactSandbox);
  },
} satisfies Theme;
