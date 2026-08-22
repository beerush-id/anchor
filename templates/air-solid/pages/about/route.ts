import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/about');
/** AirLib managed */

export const aboutRoute = route.config({ static: true, deferred: 500 }).meta({ label: 'About' });

export default aboutRoute;
