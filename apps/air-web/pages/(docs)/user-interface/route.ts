import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/user-interface');
const indexRoute = route.route('/');
const browserRoute = route.route('/browser');
const componentRoute = route.route('/component');
const formRoute = route.route('/form');
const headRoute = route.route('/head');
const imageRoute = route.route('/image');
const optimisticRoute = route.route('/optimistic');
const staticRoute = route.route('/static');
const stylingRoute = route.route('/styling');
const viewRoute = route.route('/view');
/** AirLib managed */

export const userInterfaceRoute = route;
export const userInterfaceIndexRoute = indexRoute;
export const userInterfaceBrowserRoute = browserRoute;
export const userInterfaceComponentRoute = componentRoute;
export const userInterfaceFormRoute = formRoute;
export const userInterfaceHeadRoute = headRoute;
export const userInterfaceImageRoute = imageRoute;
export const userInterfaceOptimisticRoute = optimisticRoute;
export const userInterfaceStaticRoute = staticRoute;
export const userInterfaceStylingRoute = stylingRoute;
export const userInterfaceViewRoute = viewRoute;

export default userInterfaceRoute;

parentRoute.route('/ui').rewrite(userInterfaceRoute);
