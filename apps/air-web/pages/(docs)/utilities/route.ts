import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/utilities');
/** AirLib managed */

export const utilitiesRoute = route;

export default utilitiesRoute;

parentRoute.route('/airlib').rewrite(utilitiesRoute);
