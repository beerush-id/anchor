import { page } from '@airlib/react';
import stateManagementRoute from './route.js';

export default page(stateManagementRoute).render(({ children }) => children);
