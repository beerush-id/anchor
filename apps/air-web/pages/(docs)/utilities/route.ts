import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/utilities');
const indexRoute = route.route('/');
/** AirLib managed */

export const utilitiesRoute = route;
export const utilitiesIndexRoute = indexRoute;

export default utilitiesRoute;

parentRoute.route('/airlib').rewrite(utilitiesRoute);
