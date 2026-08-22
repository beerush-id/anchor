import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/form');
const indexRoute = route.route('/');
const compositionRoute = route.route('/composition');
const configurationRoute = route.route('/configuration');
const coreApiRoute = route.route('/core-api');
const generalRoute = route.route('/general');
const gettingStartedRoute = route.route('/getting-started');
const inputsRoute = route.route('/inputs');
/** AirLib managed */

export const formRoute = route;
export const formIndexRoute = indexRoute;
export const formCompositionRoute = compositionRoute;
export const formConfigurationRoute = configurationRoute;
export const formCoreApiRoute = coreApiRoute;
export const formGeneralRoute = generalRoute;
export const formGettingStartedRoute = gettingStartedRoute;
export const formInputsRoute = inputsRoute;

export default formRoute;
