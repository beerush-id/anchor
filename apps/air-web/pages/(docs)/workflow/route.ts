import parentRoute from '../route.js';

/** AirLib managed */
const route = parentRoute.route('/workflow');
const indexRoute = route.route('/');
const monitoringRoute = route.route('/monitoring');
const planRoute = route.route('/plan');
const reactiveRoute = route.route('/reactive');
const schemaRoute = route.route('/schema');
const switchRoute = route.route('/switch');
/** AirLib managed */

export const workflowRoute = route;
export const workflowIndexRoute = indexRoute;
export const workflowMonitoringRoute = monitoringRoute;
export const workflowPlanRoute = planRoute;
export const workflowReactiveRoute = reactiveRoute;
export const workflowSchemaRoute = schemaRoute;
export const workflowSwitchRoute = switchRoute;

export default workflowRoute;
