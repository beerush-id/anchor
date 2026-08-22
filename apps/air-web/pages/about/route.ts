import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/about');
const indexRoute = route.route('/');
const policyRoute = route.route('/policy');
const privacyRoute = route.route('/privacy');
/** AirLib managed */

export const aboutRoute = route;
export const aboutIndexRoute = indexRoute.meta({ label: 'About' });
export const aboutPolicyRoute = policyRoute;
export const aboutPrivacyRoute = privacyRoute;

export default aboutRoute;
