import { page } from '@airlib/react';
import componentsRoute from './route.js';

export default page(componentsRoute).render(({ children }) => children);
