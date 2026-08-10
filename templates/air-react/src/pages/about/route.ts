import rootRoute from '../route.js';

export const aboutRoute = rootRoute.route('/about', { static: true }).meta({ label: 'About' });

export default aboutRoute;