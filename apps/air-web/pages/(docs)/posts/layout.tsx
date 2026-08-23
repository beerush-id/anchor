import { page } from '@airlib/react';
import postsRoute from './route.js';

export default page(postsRoute).render(({ children }) => children);
