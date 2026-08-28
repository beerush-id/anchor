import { redirect } from '@airlib/react';
import router from '@/src/router.js';

/** AirLib managed */
const route = router.add('/docs');
const indexRoute = route.route('/');
const extendedMarkdownRoute = route.route('/extended-markdown');
const gettingStartedRoute = route.route('/getting-started');
const installationRoute = route.route('/installation');
const universalSsrRoute = route.route('/universal-ssr');
/** AirLib managed */

export const docsRoute = route.config({ preloadMode: 'hover' });
export const docsIndexRoute = indexRoute.meta({ label: 'Docs' });
export const docsExtendedMarkdownRoute = extendedMarkdownRoute;
export const docsGettingStartedRoute = gettingStartedRoute;
export const docsInstallationRoute = installationRoute;
export const docsUniversalSsrRoute = universalSsrRoute;

export default docsRoute;

docsRoute.route('/ssr').rewrite(docsUniversalSsrRoute);

docsRoute.route('/posts').guard((_ctx, url) => {
  if (url?.pathname.includes('/posts')) {
    throw redirect(url.href.replace('/docs/', '/'));
  }
});

docsRoute.route('/news').guard((_ctx, url) => {
  if (url?.pathname.includes('/news')) {
    throw redirect(url.href.replace('/docs/news', '/releases'));
  }
});
