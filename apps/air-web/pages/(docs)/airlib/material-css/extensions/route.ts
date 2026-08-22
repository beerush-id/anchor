import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/extensions');
const indexRoute = route.route('/');
const aiRoute = route.route('/ai');
const masonryRoute = route.route('/masonry');
const skeletonRoute = route.route('/skeleton');
/** AirLib managed */

export const extensionsRoute = route;
export const extensionsIndexRoute = indexRoute;
export const extensionsAiRoute = aiRoute;
export const extensionsMasonryRoute = masonryRoute;
export const extensionsSkeletonRoute = skeletonRoute;

export default extensionsRoute;
