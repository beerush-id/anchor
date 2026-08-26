import { page } from '@airlib/react';
import extensionsRoute from './route.js';

export default page(extensionsRoute).render(({ children }) => children);
