import { page } from '@airlib/react';
import storageRoute from './route.js';

export default page(storageRoute).render(({ children }) => children);
