import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/utilities');
const indexRoute = route.route('/');
const stateRoute = route.route('/state');
const typographyRoute = route.route('/typography');
/** AirLib managed */

export const utilitiesRoute = route;
export const utilitiesIndexRoute = indexRoute;
export const utilitiesStateRoute = stateRoute;
export const utilitiesTypographyRoute = typographyRoute;

export default utilitiesRoute;
