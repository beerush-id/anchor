import { page } from '@airlib/react';
import aboutRoute from './route.js';

export default page(aboutRoute).render(({ children }) => <div className="air-mdx air-mdx-content">{children}</div>);
