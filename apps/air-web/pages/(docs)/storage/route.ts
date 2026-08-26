import { redirect } from '@airlib/react';
import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/storage');
const gettingStartedRoute = route.route('/getting-started');
const kvStoreRoute = route.route('/kv-store');
const localStorageRoute = route.route('/local-storage');
const sessionStorageRoute = route.route('/session-storage');
const tableRoute = route.route('/table');
const usageRoute = route.route('/usage');
/** AirLib managed */

export const storageRoute = route;
export const storageGettingStartedRoute = gettingStartedRoute;
export const storageKvStoreRoute = kvStoreRoute;
export const storageLocalStorageRoute = localStorageRoute;
export const storageSessionStorageRoute = sessionStorageRoute;
export const storageTableRoute = tableRoute;
export const storageUsageRoute = usageRoute;

export default storageRoute;

storageRoute.route('/').guard(() => {
  throw redirect(storageGettingStartedRoute);
});
