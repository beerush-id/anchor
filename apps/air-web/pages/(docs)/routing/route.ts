import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/routing');
const indexRoute = route.route('/');
const dataLoadersRoute = route.route('/data-loaders');
const guardsRoute = route.route('/guards');
const navigationRoute = route.route('/navigation');
const routesLayoutsRoute = route.route('/routes-layouts');
const sitemapRoute = route.route('/sitemap');
/** AirLib managed */

export const routingRoute = route;
export const routingIndexRoute = indexRoute;
export const routingDataLoadersRoute = dataLoadersRoute;
export const routingGuardsRoute = guardsRoute;
export const routingNavigationRoute = navigationRoute;
export const routingRoutesLayoutsRoute = routesLayoutsRoute;
export const routingSitemapRoute = sitemapRoute;

export default routingRoute;
