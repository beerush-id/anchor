import { page } from '@airlib/react';
import formRoute from './route.js';

export default page(formRoute).render(({ children }) => children);
