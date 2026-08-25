import { Link, NotFoundError, page } from '@airlib/react';
import { Layout } from '@airlib/react/mdx';
import Header from '@/components/Header.js';
import { RouterProgress } from '@/components/RouterProgress.js';
import { Search } from '@/components/Search.js';
import { navs } from './nav.js';
import docsRoute from './route.js';

import './docs.css';

docsRoute.catch(({ error }) => {
  const status = error instanceof NotFoundError ? 404 : 500;
  const label = status === 404 ? 'Page Not Found' : 'Something Went Wrong';

  return (
    <div className="air-mdx-error">
      <span className="air-mdx-error-status">{status}</span>
      <h1 className="air-mdx-error-title">{label}</h1>
      <p className="air-mdx-error-message">{error.message}</p>
      <div className="air-mdx-error-actions">
        <Link href="../">Back to Docs</Link>
      </div>
    </div>
  );
});

export default page(docsRoute).render(({ children }) => (
  <>
    <RouterProgress />
    <Header>
      <Search />
    </Header>
    <Layout nav={navs}>{children}</Layout>
  </>
));
