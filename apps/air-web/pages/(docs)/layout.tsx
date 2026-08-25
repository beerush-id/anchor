import { Link, NotFoundError, page } from '@airlib/react';
import { Layout, Sidebar } from '@airlib/react/mdx';
import { DocsSelector } from '@/components/DocsSelector.js';
import Header from '@/components/Header.js';
import { RouterProgress } from '@/components/RouterProgress.js';
import { Search } from '@/components/Search.js';
import { navs } from './nav.js';
import docsRoute from './route.js';

import './docs.css';

const frameworkOptions = [
  { value: 'react', label: 'React' },
  { value: 'solid', label: 'SolidJS' },
];

const pmOptions = [
  { value: 'bun', label: 'Bun' },
  { value: 'npm', label: 'NPM' },
  { value: 'pnpm', label: 'PNPM' },
  { value: 'yarn', label: 'Yarn' },
];

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
    <Layout nav={navs}>
      <Layout.Snippet for={'sidebar'}>
        {() => (
          <>
            <div className="docs-selectors">
              <DocsSelector name="framework" label="Framework" icon="framework" options={frameworkOptions} />
              <DocsSelector name="pm" label="Package Manager" icon="pm" options={pmOptions} />
            </div>
            <Sidebar nav={navs} collapsible />
          </>
        )}
      </Layout.Snippet>
      {children}
    </Layout>
  </>
));
