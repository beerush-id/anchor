import { page } from '@airlib/react';
import remoteFunctionRoute from './route.js';

export default page(remoteFunctionRoute).render(({ children }) => children);
