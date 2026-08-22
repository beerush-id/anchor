import { page } from '@airlib/react';
import airlibRoute from './route.js';

export default page(airlibRoute).render(({ children }) => children);
