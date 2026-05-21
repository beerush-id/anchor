## 5. Universal SSR
Isolates state per-request, enabling native reactive hooks on the server without `'use client'` boundaries.

### SSR: Request Isolation
```tsx
import { withIsolation, createLifecycle } from '@anchorlib/core';
import { decodeCookies, setCookieContext } from '@anchorlib/react';

export async function render(url: string, cookie = '') {
  let html = '';
  let cookies: string[] = [];

  // 1. Create a completely isolated reactive scope for this request
  await withIsolation(async () => {
    const jar = decodeCookies(cookie);
    setCookieContext(jar);

    const ssr = createLifecycle();
    
    await ssr.runAsync(async () => {
      await router.activate(url);
      html = renderToString(<UIRouter router={router} root={RootLayout} url={url} />);
      router.cleanup();
    });

    cookies = jar.encode();
    ssr.destroy();
  });

  return { html, cookies };
}
```
