import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/remote-function');
const indexRoute = route.route('/');
const crudRoute = route.route('/crud');
const distributionRoute = route.route('/distribution');
const durableRoute = route.route('/durable');
const functionRoute = route.route('/function');
const handlerRoute = route.route('/handler');
const interceptorsRoute = route.route('/interceptors');
const transportRoute = route.route('/transport');
const webhookRoute = route.route('/webhook');
/** AirLib managed */

export const remoteFunctionRoute = route;
export const remoteFunctionIndexRoute = indexRoute;
export const remoteFunctionCrudRoute = crudRoute;
export const remoteFunctionDistributionRoute = distributionRoute;
export const remoteFunctionDurableRoute = durableRoute;
export const remoteFunctionFunctionRoute = functionRoute;
export const remoteFunctionHandlerRoute = handlerRoute;
export const remoteFunctionInterceptorsRoute = interceptorsRoute;
export const remoteFunctionTransportRoute = transportRoute;
export const remoteFunctionWebhookRoute = webhookRoute;

export default remoteFunctionRoute;
