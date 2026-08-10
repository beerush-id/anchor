import { page } from '@anchorlib/solid';
import { ErrorView } from '../components/ErrorView.js';
import Header from '../components/Header.js';
import { rootRoute } from './route.ts';

rootRoute.catch(({ error }) => <ErrorView error={error} />);

export default page(rootRoute).render(({ children }) => (
  <>
    <Header />
    <main>{children}</main>
  </>
));