import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/material-css');
const indexRoute = route.route('/');
const gettingStartedRoute = route.route('/getting-started');
const themeRoute = route.route('/theme');
/** AirLib managed */

export const materialCssRoute = route;
export const materialCssIndexRoute = indexRoute;
export const materialCssGettingStartedRoute = gettingStartedRoute;
export const materialCssThemeRoute = themeRoute;

export default materialCssRoute;
