import { page } from '@airlib/react';
import workflowRoute from './route.js';

export default page(workflowRoute).render(({ children }) => children);
