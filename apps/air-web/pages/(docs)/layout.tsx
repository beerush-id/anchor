import { Link, NotFoundError, page } from '@airlib/react';
import { Layout, Sidebar } from '@airlib/react/mdx';
import { DocsSelector } from '@/components/DocsSelector.js';
import { ErrorView } from '@/components/ErrorView.js';
import Footer from '@/components/Footer.js';
import Header from '@/components/Header.js';
import { RouterProgress } from '@/components/RouterProgress.js';
import { navs } from './nav.js';
import docsRoute, { docsGettingStartedRoute } from './route.js';

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

docsRoute.catch(({ error }) => (
  <ErrorView
    error={error}
    title={error instanceof NotFoundError ? 'Documentation Not Found' : undefined}
    description={
      error instanceof NotFoundError
        ? "The documentation page you are looking for doesn't exist or may have been reorganized."
        : undefined
    }
  >
    <ErrorView.Snippet for="actions">
      {() => (
        <Link to={docsGettingStartedRoute} className="air-cta">
          Getting Started
        </Link>
      )}
    </ErrorView.Snippet>
  </ErrorView>
));

export default page(docsRoute).render(({ children }) => (
  <>
    <RouterProgress />
    <Header />
    <Layout nav={navs} className="bg-surface">
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
    <Footer />
  </>
));
