import '@anchorlib/react/server'; // MUST be first!
import {
  createLifecycle,
  decodeCookies,
  headings,
  Redirect,
  redirectUrl,
  setCookieContext,
  UIRouter,
  withIsolation,
} from '@anchorlib/react';
import { renderToString } from 'react-dom/server';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

export async function render(url: string, cookie = '') {
  let html = '';
  let head = '';
  let redirect: string | undefined;

  let cookies: string[] = [];

  await withIsolation(async () => {
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    const ssr = createLifecycle();
    await ssr.runAsync(async () => {
      try {
        const blocker = await router.activate(url);

        if (blocker instanceof Redirect) {
          redirect = redirectUrl(blocker);
          return { redirect };
        }

        html = renderToString(<UIRouter router={router} root={RootLayout} url={url} headless={true} resetScroll />);
        // biome-ignore lint/suspicious/noArrayIndexKey: Safe to use index as key.
        head = renderToString([...headings().values()].map(({ Renderer }, i) => <Renderer key={i} />));
      } catch (error) {
        head = '';
        html = `SSR Render Error: ${error}`;
      } finally {
        router.cleanup();
      }
    });

    cookies = jar.encode();
    ssr.destroy();
  });

  return { html, head, redirect, cookies };
}
