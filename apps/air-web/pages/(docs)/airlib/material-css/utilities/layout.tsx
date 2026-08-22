import { page } from '@airlib/react';
import utilitiesRoute from './route.js';

export default page(utilitiesRoute).render(({ children }) => children);
