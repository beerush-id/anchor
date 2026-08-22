import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/state-management');
const indexRoute = route.route('/');
const advancedRoute = route.route('/advanced');
const asyncHandlingRoute = route.route('/async-handling');
const derivedRoute = route.route('/derived');
const formHandlingRoute = route.route('/form-handling');
const immutableRoute = route.route('/immutable');
const mutableRoute = route.route('/mutable');
const sideEffectRoute = route.route('/side-effect');
/** AirLib managed */

export const stateManagementRoute = route;
export const stateManagementIndexRoute = indexRoute;
export const stateManagementAdvancedRoute = advancedRoute;
export const stateManagementAsyncHandlingRoute = asyncHandlingRoute;
export const stateManagementDerivedRoute = derivedRoute;
export const stateManagementFormHandlingRoute = formHandlingRoute;
export const stateManagementImmutableRoute = immutableRoute;
export const stateManagementMutableRoute = mutableRoute;
export const stateManagementSideEffectRoute = sideEffectRoute;

export default stateManagementRoute;
