import { page } from '@airlib/react';
import { ArticleLayout } from '@/components/ArticleLayout.js';
import releasesRoute from './route.js';

export default page(releasesRoute).render(({ children }) => <ArticleLayout>{children}</ArticleLayout>);
