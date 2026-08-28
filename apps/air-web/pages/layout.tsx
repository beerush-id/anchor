import { page } from '@airlib/react';
import { ErrorView } from '@/components/ErrorView.js';
import Footer from '@/components/Footer.js';
import Header from '@/components/Header.js';
import { RouterProgress } from '@/components/RouterProgress.js';
import rootRoute from './route.js';

rootRoute.catch(({ error }) => <ErrorView error={error} />);

export default page(rootRoute).render(({ children }) => (
  <>
    <RouterProgress />
    <Header />
    <main className="air-main">{children}</main>
    <Footer />
  </>
));
