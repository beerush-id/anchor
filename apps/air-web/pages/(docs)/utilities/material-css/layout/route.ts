import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/layout');
const indexRoute = route.route('/');
const accordionRoute = route.route('/accordion');
const appBarRoute = route.route('/app-bar');
const bottomSheetRoute = route.route('/bottom-sheet');
const carouselRoute = route.route('/carousel');
const navigationBarRoute = route.route('/navigation-bar');
const navigationDrawerRoute = route.route('/navigation-drawer');
const navigationRailRoute = route.route('/navigation-rail');
const sideSheetRoute = route.route('/side-sheet');
const tabsRoute = route.route('/tabs');
/** AirLib managed */

export const layoutRoute = route;
export const layoutIndexRoute = indexRoute;
export const layoutAccordionRoute = accordionRoute;
export const layoutAppBarRoute = appBarRoute;
export const layoutBottomSheetRoute = bottomSheetRoute;
export const layoutCarouselRoute = carouselRoute;
export const layoutNavigationBarRoute = navigationBarRoute;
export const layoutNavigationDrawerRoute = navigationDrawerRoute;
export const layoutNavigationRailRoute = navigationRailRoute;
export const layoutSideSheetRoute = sideSheetRoute;
export const layoutTabsRoute = tabsRoute;

export default layoutRoute;
