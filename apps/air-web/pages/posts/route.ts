import rootRoute from '../route.js';

/** AirLib managed */
const route = rootRoute.route('/posts');
const indexRoute = route.route('/');
const airstackVsNextjsRoute = route.route('/airstack-vs-nextjs');
const airstackVsRemixRoute = route.route('/airstack-vs-remix');
const airstackVsTanstackRoute = route.route('/airstack-vs-tanstack');
const airstackVsSolidstartRoute = route.route('/airstack-vs-solidstart');
const irpcVsTrpcRoute = route.route('/irpc-vs-trpc');
const irpcVsElysiaRoute = route.route('/irpc-vs-elysia');
const irpcVsNestjsRoute = route.route('/irpc-vs-nestjs');
const irpcVsHonoRoute = route.route('/irpc-vs-hono');
const airformVsReactHookFormRoute = route.route('/airform-vs-react-hook-form');
const airformVsFormikRoute = route.route('/airform-vs-formik');
const airformVsTanstackFormRoute = route.route('/airform-vs-tanstack-form');
const airformVsModularFormsRoute = route.route('/airform-vs-modular-forms');
const buildingFormsWithAirFormRoute = route.route('/building-forms-with-air-form');
const buildingSmartFormComponentsRoute = route.route('/building-smart-form-components');
/** AirLib managed */

export const postsRoute = route.config({ preloadMode: 'hover' });
export const postsIndexRoute = indexRoute;
export const postsAirstackVsNextjsRoute = airstackVsNextjsRoute;
export const postsAirstackVsRemixRoute = airstackVsRemixRoute;
export const postsAirstackVsTanstackRoute = airstackVsTanstackRoute;
export const postsAirstackVsSolidstartRoute = airstackVsSolidstartRoute;
export const postsIrpcVsTrpcRoute = irpcVsTrpcRoute;
export const postsIrpcVsElysiaRoute = irpcVsElysiaRoute;
export const postsIrpcVsNestjsRoute = irpcVsNestjsRoute;
export const postsIrpcVsHonoRoute = irpcVsHonoRoute;
export const postsAirformVsReactHookFormRoute = airformVsReactHookFormRoute;
export const postsAirformVsFormikRoute = airformVsFormikRoute;
export const postsAirformVsTanstackFormRoute = airformVsTanstackFormRoute;
export const postsAirformVsModularFormsRoute = airformVsModularFormsRoute;
export const postsBuildingFormsWithAirFormRoute = buildingFormsWithAirFormRoute;
export const postsBuildingSmartFormComponentsRoute = buildingSmartFormComponentsRoute;

export default postsRoute;
