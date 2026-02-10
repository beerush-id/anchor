/**
 * @module @anchorlib/router
 *
 * A type-safe, reactive router for JavaScript and TypeScript applications.
 *
 * @example
 * ```ts
 * import { createRouter, redirect } from '@anchorlib/router';
 *
 * const router = createRouter({ baseUrl: 'https://example.com' });
 *
 * const usersRoute = router.route('/users');
 * const userRoute = usersRoute.route('/:id');
 *
 * userRoute
 *   .guard(async ({ params }) => {
 *     if (!await isAuthenticated()) {
 *       throw redirect(loginRoute);
 *     }
 *   })
 *   .provide('user', async ({ params }) => {
 *     return await fetchUser(params.id);
 *   });
 *
 * await router.activate('/users/123');
 * ```
 */

export * from './cache.js';
export * from './constant.ts';
export * from './enum.js';
export * from './query.js';
export * from './redirect.js';
export * from './registry.js';
export * from './route.js';
export * from './router.js';
export * from './types.js';
export * from './utils.js';
