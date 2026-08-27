import { page } from '@airlib/react';
import { ArticleLayout } from '@/components/ArticleLayout.js';
import postsRoute from './route.js';

export default page(postsRoute).render(({ children }) => <ArticleLayout>{children}</ArticleLayout>);
