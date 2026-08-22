import router from '@/src/router.js';

/** AirLib managed */
const route = router.add('/docs');
const indexRoute = route.route('/');
const extendedMarkdownRoute = route.route('/extended-markdown');
const gettingStartedRoute = route.route('/getting-started');
const installationRoute = route.route('/installation');
const universalSsrRoute = route.route('/universal-ssr');
/** AirLib managed */

export const docsRoute = route.config({ static: true, deferred: 500 });
export const docsIndexRoute = indexRoute.meta({ label: 'Docs' });
export const docsExtendedMarkdownRoute = extendedMarkdownRoute;
export const docsGettingStartedRoute = gettingStartedRoute;
export const docsInstallationRoute = installationRoute;
export const docsUniversalSsrRoute = universalSsrRoute;

export default docsRoute;

docsRoute.route('/ssr').rewrite(docsUniversalSsrRoute);
