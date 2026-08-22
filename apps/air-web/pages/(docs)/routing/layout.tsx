import { page } from '@airlib/react';
import routingRoute from './route.js';

export default page(routingRoute).render(({ children }) => children);
