import { page } from '@airlib/react';
import layoutRoute from './route.js';

export default page(layoutRoute).render(({ children }) => children);
