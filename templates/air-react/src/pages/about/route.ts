import { rootRoute } from '../route.js';

export const aboutRoute = rootRoute.route('/about').provide('meta', () => {
  return {
    title: 'About — AIR Stack',
    description: 'Anchor for React — fine-grained reactive state, SSR routing, and zero hooks.',
  };
});
