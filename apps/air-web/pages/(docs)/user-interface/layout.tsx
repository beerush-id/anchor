import { page } from '@airlib/react';
import userInterfaceRoute from './route.js';

export default page(userInterfaceRoute).render(({ children }) => children);
