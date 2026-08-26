import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/releases');
const indexRoute = route.route('/');
const releaseV1Route = route.route('/release-v1');
const releaseV11Route = route.route('/release-v1.1');
const releaseV12Route = route.route('/release-v1.2');
const releaseV1221Route = route.route('/release-v1.2.21');
const releaseV1222Route = route.route('/release-v1.2.22');
const releaseV1223Route = route.route('/release-v1.2.23');
const releaseV130Route = route.route('/release-v1.3.0');
const releaseV131Route = route.route('/release-v1.3.1');
/** AirLib managed */

export const releasesRoute = route;
export const releasesIndexRoute = indexRoute;

export const releasesReleaseV11Route = releaseV11Route;
export const releasesReleaseV1221Route = releaseV1221Route;
export const releasesReleaseV1222Route = releaseV1222Route;
export const releasesReleaseV1223Route = releaseV1223Route;
export const releasesReleaseV12Route = releaseV12Route;
export const releasesReleaseV130Route = releaseV130Route;
export const releasesReleaseV1Route = releaseV1Route;
export const releasesReleaseV131Route = releaseV131Route;

export default releasesRoute;

parentRoute.route('/news').rewrite(releasesRoute);
