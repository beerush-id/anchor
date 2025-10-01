import { Header } from '@components/Header.js';
import { useCtaHoverCount } from '@lib/nav.js';

export default function Home() {
  useCtaHoverCount();

  return (
    <>
      <Header />
      <main className="w-screen bg-slate-900 text-white"></main>
    </>
  );
}
