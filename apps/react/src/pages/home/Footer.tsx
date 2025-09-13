import { getCtaHoverCount } from '@lib/nav.js';
import { observe } from '@anchorlib/react/components';
import { SectionTitle } from '@components/Section.js';
import { MainCTA } from '@components/MainCTA.js';
import { useRef } from 'react';
import { debugRender } from '@anchorlib/react';

export function Footer() {
  const ref = useRef<HTMLParagraphElement>(null);
  const ctaHoverCount = getCtaHoverCount();

  const CTAHoverInfo = observe(() => {
    if (!ctaHoverCount || ctaHoverCount.value < 3) return;

    debugRender(ref);

    return (
      <p ref={ref} className="text-slate-400 text-sm flex flex-col">
        <span>
          <strong className="font-semibold">{ctaHoverCount.value}</strong> times you've hovered over the{' '}
          <strong className="font-semibold">Getting Started</strong> button.
        </span>
        <span className="font-medium"> Mind to click it?</span>
      </p>
    );
  });

  return (
    <>
      <section className="container mx-auto md:max-w-6xl px-4 py-4 md:py-10 sm:px-6 lg:px-8 text-center">
        <SectionTitle>Ready to Anchor Your State?</SectionTitle>
        <p className="mt-4 text-slate-400">Get started in seconds. Install the package and simplify your app today.</p>
        <div className="w-full my-10 md:my-20">
          <MainCTA tiys={false} className="mb-6" />
          <CTAHoverInfo />
        </div>
      </section>

      <footer className="text-center py-8 text-slate-300 text-sm">
        <p className="flex flex-col px-4">
          <span>© {new Date().getFullYear()} Anchor. All rights reserved.&nbsp;</span>
        </p>
        <p className="flex items-center justify-center">
          <span>Built with ❤️ by&nbsp;</span>
          <a
            href="https://www.mahdaen.name"
            target="_blank"
            className="font-medium hover:text-slate-300 transition-colors">
            Nanang Mahdaen El Agung
          </a>
        </p>
      </footer>
    </>
  );
}
