import { page } from '@airlib/react';
import releasesRoute from './route.js';

export default page(releasesRoute).render(({ children }) => children);
